'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Prisma } from "@prisma/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditFilters {
    entityType?: string   // 'Job', 'Invoice', 'User', etc.
    entityId?: string
    action?: string       // 'CREATE', 'UPDATE', 'DELETE'
    userId?: string
    dateFrom?: string     // ISO date string
    dateTo?: string       // ISO date string
    page?: number
    pageSize?: number
}

interface AuditLogEntry {
    id: string
    entityType: string
    entityId: string
    action: string
    actorId: string
    changes: string | null
    ipAddress: string | null
    createdAt: Date
}

interface PaginatedAuditResult {
    logs: AuditLogEntry[]
    total: number
    page: number
    totalPages: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin() {
    const session = await auth()
    if (!session?.user) {
        throw new Error("Unauthorized")
    }
    if (session.user.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required")
    }
    return session
}

function clampPageSize(raw?: number): number {
    const size = raw ?? 25
    if (size < 1) return 1
    if (size > 100) return 100
    return size
}

// ---------------------------------------------------------------------------
// 1. getAuditLogs  --  Admin-only, paginated audit log viewer
// ---------------------------------------------------------------------------

export async function getAuditLogs(
    filters: AuditFilters = {}
): Promise<PaginatedAuditResult> {
    await requireAdmin()

    const {
        entityType,
        entityId,
        action,
        userId,
        dateFrom,
        dateTo,
    } = filters

    const page = Math.max(filters.page ?? 1, 1)
    const pageSize = clampPageSize(filters.pageSize)

    // Build the dynamic where clause
    const where: Prisma.AuditLogWhereInput = {}

    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action
    if (userId) where.actorId = userId

    if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
            where.createdAt.gte = new Date(dateFrom)
        }
        if (dateTo) {
            // Include the entire "dateTo" day by pushing to end of day
            const endDate = new Date(dateTo)
            endDate.setHours(23, 59, 59, 999)
            where.createdAt.lte = endDate
        }
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
        totalPages: Math.ceil(total / pageSize) || 1,
    }
}

// ---------------------------------------------------------------------------
// 2. getEntityHistory  --  Full history of a specific entity
// ---------------------------------------------------------------------------

export async function getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { page?: number; pageSize?: number }
): Promise<PaginatedAuditResult> {
    await requireAdmin()

    if (!entityType || !entityId) {
        throw new Error("entityType and entityId are required")
    }

    const page = Math.max(options?.page ?? 1, 1)
    const pageSize = clampPageSize(options?.pageSize)

    const where: Prisma.AuditLogWhereInput = {
        entityType,
        entityId,
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
        totalPages: Math.ceil(total / pageSize) || 1,
    }
}
