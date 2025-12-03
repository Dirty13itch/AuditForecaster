import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"

import { Prisma } from "@prisma/client"

interface AuditLogParams {
    entityType: string
    entityId: string
    action: "CREATE" | "UPDATE" | "DELETE"
    changes?: Record<string, unknown>
    tx?: Prisma.TransactionClient // Optional transaction client
}

export async function logAudit({ entityType, entityId, action, changes, tx, actorId: explicitActorId }: AuditLogParams & { actorId?: string }) {
    try {
        let actorId = explicitActorId || 'SYSTEM'
        let ip = 'unknown'

        // Only try to get session/headers if no explicit actorId is provided (implies request context)
        // or if we want to try anyway but fail gracefully.
        if (!explicitActorId) {
            try {
                const session = await auth()
                if (session?.user?.id) {
                    actorId = session.user.id
                }

                const headersList = await headers()
                ip = headersList.get('x-forwarded-for') || 'unknown'
            } catch {
                // Ignore errors from auth/headers (likely running in worker)
            }
        }

        const db = tx || prisma

        await db.auditLog.create({
            data: {
                entityType,
                entityId,
                action,
                actorId,
                changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
                ipAddress: ip
            }
        })
    } catch (error) {
        console.error('Failed to write audit log:', error)
        // We do NOT throw here, to prevent blocking the main action if logging fails
    }
}
