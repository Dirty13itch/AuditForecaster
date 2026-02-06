'use server'

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
import { z } from "zod"
import type { ActionResult } from "@/lib/types"

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const CompanyInfoSchema = z.object({
    companyName: z.string().max(200, "Company name must be 200 characters or less").default(''),
    address: z.string().max(500, "Address must be 500 characters or less").default(''),
    phone: z.string().max(30, "Phone number must be 30 characters or less").default(''),
    licenseNumber: z.string().max(100, "License number must be 100 characters or less").default(''),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanyInfoRow {
    id: string
    userId: string
    companyName: string | null
    address: string | null
    phone: string | null
    licenseNumber: string | null
    emailNotifications: number
    inAppNotifications: number
}

export interface CompanyInfo {
    companyName: string
    address: string
    phone: string
    licenseNumber: string
    emailNotifications: boolean
    inAppNotifications: boolean
}

// ---------------------------------------------------------------------------
// Table initialization
// ---------------------------------------------------------------------------

/**
 * The CompanyInfo table is managed via raw SQL rather than the Prisma schema
 * so that this feature is self-contained and requires no migration. The table
 * stores company-level settings and notification preferences per user.
 *
 * If you later add this model to prisma/schema.prisma, remove ensureTable()
 * and switch the queries below to use prisma.companyInfo.* instead.
 */
let tableEnsured = false

async function ensureTable() {
    if (tableEnsured) return
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CompanyInfo" (
            "id" TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL UNIQUE,
            "companyName" TEXT DEFAULT '',
            "address" TEXT DEFAULT '',
            "phone" TEXT DEFAULT '',
            "licenseNumber" TEXT DEFAULT '',
            "emailNotifications" INTEGER NOT NULL DEFAULT 1,
            "inAppNotifications" INTEGER NOT NULL DEFAULT 1,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
    tableEnsured = true
}

function generateId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `c${timestamp}${random}`
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getCompanyInfo(): Promise<CompanyInfo | null> {
    const session = await auth()
    if (!session?.user?.id) return null

    try {
        await ensureTable()

        const userId = session.user.id
        const rows = await prisma.$queryRaw<CompanyInfoRow[]>(
            Prisma.sql`SELECT * FROM "CompanyInfo" WHERE "userId" = ${userId}`
        )

        if (rows.length === 0) {
            return {
                companyName: '',
                address: '',
                phone: '',
                licenseNumber: '',
                emailNotifications: true,
                inAppNotifications: true,
            }
        }

        const row = rows[0]
        if (!row) {
            return {
                companyName: '',
                address: '',
                phone: '',
                licenseNumber: '',
                emailNotifications: true,
                inAppNotifications: true,
            }
        }
        return {
            companyName: row.companyName || '',
            address: row.address || '',
            phone: row.phone || '',
            licenseNumber: row.licenseNumber || '',
            emailNotifications: Boolean(row.emailNotifications),
            inAppNotifications: Boolean(row.inAppNotifications),
        }
    } catch (error) {
        logger.error('Failed to fetch company info', { error } as Record<string, unknown>)
        return null
    }
}

// ---------------------------------------------------------------------------
// Update company information
// ---------------------------------------------------------------------------

export async function updateCompanyInfo(formData: FormData): Promise<ActionResult> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const rawData = {
            companyName: (formData.get('companyName') as string) || '',
            address: (formData.get('address') as string) || '',
            phone: (formData.get('phone') as string) || '',
            licenseNumber: (formData.get('licenseNumber') as string) || '',
        }

        const validated = CompanyInfoSchema.parse(rawData)

        await ensureTable()

        const userId = session.user.id
        const rows = await prisma.$queryRaw<CompanyInfoRow[]>(
            Prisma.sql`SELECT "id" FROM "CompanyInfo" WHERE "userId" = ${userId}`
        )

        if (rows.length > 0) {
            await prisma.$executeRaw(
                Prisma.sql`UPDATE "CompanyInfo"
                    SET "companyName" = ${validated.companyName},
                        "address" = ${validated.address},
                        "phone" = ${validated.phone},
                        "licenseNumber" = ${validated.licenseNumber},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "userId" = ${userId}`
            )
        } else {
            const id = generateId()
            await prisma.$executeRaw(
                Prisma.sql`INSERT INTO "CompanyInfo" ("id", "userId", "companyName", "address", "phone", "licenseNumber")
                    VALUES (${id}, ${userId}, ${validated.companyName}, ${validated.address}, ${validated.phone}, ${validated.licenseNumber})`
            )
        }

        await logAudit({
            entityType: 'CompanyInfo',
            entityId: userId,
            action: rows.length > 0 ? 'UPDATE' : 'CREATE',
            changes: validated,
        })

        revalidatePath('/dashboard/settings')
        return { success: true, message: 'Company information updated successfully' }
    } catch (error) {
        logger.error('Failed to update company info', { error } as Record<string, unknown>)
        if (error instanceof z.ZodError) {
            return {
                success: false,
                message: error.errors[0]?.message || 'Validation failed',
                errors: error.errors.map(e => ({ message: e.message, path: e.path.map(String) })),
            }
        }
        return { success: false, message: 'Failed to update company information' }
    }
}

// ---------------------------------------------------------------------------
// Update notification preferences
// ---------------------------------------------------------------------------

export async function updateNotificationPreferences(formData: FormData): Promise<ActionResult> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const emailNotifications = formData.get('emailNotifications') === 'true'
        const inAppNotifications = formData.get('inAppNotifications') === 'true'

        await ensureTable()

        const userId = session.user.id
        const emailInt = emailNotifications ? 1 : 0
        const inAppInt = inAppNotifications ? 1 : 0

        const rows = await prisma.$queryRaw<CompanyInfoRow[]>(
            Prisma.sql`SELECT "id" FROM "CompanyInfo" WHERE "userId" = ${userId}`
        )

        if (rows.length > 0) {
            await prisma.$executeRaw(
                Prisma.sql`UPDATE "CompanyInfo"
                    SET "emailNotifications" = ${emailInt},
                        "inAppNotifications" = ${inAppInt},
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "userId" = ${userId}`
            )
        } else {
            const id = generateId()
            await prisma.$executeRaw(
                Prisma.sql`INSERT INTO "CompanyInfo" ("id", "userId", "emailNotifications", "inAppNotifications")
                    VALUES (${id}, ${userId}, ${emailInt}, ${inAppInt})`
            )
        }

        revalidatePath('/dashboard/settings')
        return { success: true, message: 'Notification preferences updated successfully' }
    } catch (error) {
        logger.error('Failed to update notification preferences', { error } as Record<string, unknown>)
        return { success: false, message: 'Failed to update notification preferences' }
    }
}
