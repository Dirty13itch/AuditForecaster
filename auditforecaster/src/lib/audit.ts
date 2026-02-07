import 'server-only'
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"
import { Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"

interface AuditLogParams {
    entityType: string
    entityId: string
    action: "CREATE" | "UPDATE" | "DELETE"
    changes?: Record<string, unknown>
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
    userId?: string
    userEmail?: string
    /** @deprecated Use `userId` instead */
    actorId?: string
    tx?: Prisma.TransactionClient // Optional transaction client
}

/**
 * Log an audit trail entry. For UPDATE operations, pass `before` and `after`
 * to automatically compute a structured diff stored in the `changes` column.
 *
 * The function never throws -- audit logging failures are swallowed so they
 * cannot block the primary business operation.
 */
export async function logAudit({
    entityType,
    entityId,
    action,
    changes,
    before,
    after,
    userId: explicitUserId,
    userEmail: explicitUserEmail,
    actorId: legacyActorId,
    tx,
}: AuditLogParams) {
    try {
        let actorId = explicitUserId || legacyActorId || "SYSTEM"
        let actorEmail = explicitUserEmail || null
        let ip = "unknown"

        // Only try to get session/headers if no explicit userId/actorId is provided
        // (implies request context) or if we want to try anyway but fail gracefully.
        if (!explicitUserId && !legacyActorId) {
            try {
                const session = await auth()
                if (session?.user?.id) {
                    actorId = session.user.id
                }
                if (session?.user?.email) {
                    actorEmail = session.user.email
                }

                const headersList = await headers()
                ip =
                    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                    headersList.get("x-real-ip") ||
                    "unknown"
            } catch {
                // Ignore errors from auth/headers (likely running in worker)
            }
        }

        // Build the changes payload.
        // For UPDATE operations, prefer structured before/after if provided.
        let changesPayload: Record<string, unknown> | undefined = changes

        if (action === "UPDATE" && before && after) {
            const diff = computeDiff(before, after)
            changesPayload = {
                before: filterChangedFields(before, diff),
                after: filterChangedFields(after, diff),
            }
        } else if (action === "UPDATE" && (before || after)) {
            // Partial before/after -- store whatever we have
            changesPayload = {
                ...(before ? { before } : {}),
                ...(after ? { after } : {}),
            }
        }

        const db = tx || prisma

        await db.auditLog.create({
            data: {
                entityType,
                entityId,
                action,
                actorId,
                changes: changesPayload
                    ? JSON.stringify({
                          ...changesPayload,
                          ...(actorEmail ? { _actorEmail: actorEmail } : {}),
                      })
                    : actorEmail
                      ? JSON.stringify({ _actorEmail: actorEmail })
                      : undefined,
                ipAddress: ip,
            },
        })
    } catch (error) {
        logger.error("Failed to write audit log", {
            error,
            entityType,
            entityId,
            action,
        } as Record<string, unknown>)
        // We do NOT throw here, to prevent blocking the main action if logging fails
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute which top-level keys differ between two objects.
 * Returns a Set of changed key names.
 */
function computeDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>
): Set<string> {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    const changed = new Set<string>()

    for (const key of allKeys) {
        // Skip internal/meta fields
        if (key === "updatedAt" || key === "version") continue

        const bVal = JSON.stringify(before[key])
        const aVal = JSON.stringify(after[key])
        if (bVal !== aVal) {
            changed.add(key)
        }
    }

    return changed
}

/**
 * Return only the keys present in `changedKeys` from `obj`.
 */
function filterChangedFields(
    obj: Record<string, unknown>,
    changedKeys: Set<string>
): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const key of changedKeys) {
        if (key in obj) {
            result[key] = obj[key]
        }
    }
    return result
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface AuditLogFilters {
    entityType?: string
    entityId?: string
    action?: string
    actorId?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    pageSize?: number
}

/**
 * Retrieve audit logs with dynamic filtering and pagination.
 * Intended to be called from trusted server-side code (server actions)
 * that has already verified authorization.
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
    const {
        entityType,
        entityId,
        action,
        actorId,
        dateFrom,
        dateTo,
        page = 1,
        pageSize = 25,
    } = filters

    const where: Prisma.AuditLogWhereInput = {}

    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action
    if (actorId) where.actorId = actorId

    if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = dateFrom
        if (dateTo) where.createdAt.lte = dateTo
    }

    const skip = (page - 1) * pageSize

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
        }),
        prisma.auditLog.count({ where }),
    ])

    return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
    }
}
