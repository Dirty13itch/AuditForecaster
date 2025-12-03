import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { headers } from "next/headers"

import { Prisma } from "@prisma/client"

interface AuditLogParams {
    entityType: string
    entityId: string
    action: "CREATE" | "UPDATE" | "DELETE"
    changes?: Record<string, any>
    tx?: Prisma.TransactionClient // Optional transaction client
}

export async function logAudit({ entityType, entityId, action, changes, tx }: AuditLogParams) {
    try {
        const session = await auth()
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for') || 'unknown'

        const actorId = session?.user?.id || 'SYSTEM'

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
