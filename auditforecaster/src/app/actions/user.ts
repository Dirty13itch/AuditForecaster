'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { logAudit } from "@/lib/audit"
import { z } from "zod"
import { hash, compare } from "bcryptjs"

const ProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
})

const PasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export async function updateProfile(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const rawData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
        }

        const validated = ProfileSchema.parse(rawData)

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: validated.name,
                email: validated.email,
                // phone: validated.phone // Assuming phone field exists or will exist
            }
        })

        await logAudit({
            entityType: 'User',
            entityId: session.user.id,
            action: 'UPDATE',
            changes: validated
        })

        revalidatePath('/dashboard/settings')
        return { success: true, message: 'Profile updated successfully' }
    } catch (error) {
        logger.error('Failed to update profile', { error })
        return { success: false, message: error instanceof Error ? error.message : 'Failed to update profile' }
    }
}

export async function changePassword(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    try {
        const rawData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
        }

        const validated = PasswordSchema.parse(rawData)

        // Verify current password
        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user || !user.passwordHash) {
            throw new Error("User not found or invalid auth method")
        }

        // Verify current password before allowing change
        const isValid = await compare(validated.currentPassword, user.passwordHash)
        if (!isValid) {
            return { success: false, message: "Incorrect current password" }
        }

        const newHash = await hash(validated.newPassword, 12)

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                passwordHash: newHash,
                tokenVersion: { increment: 1 } // Revoke other sessions
            }
        })

        await logAudit({
            entityType: 'User',
            entityId: session.user.id,
            action: 'UPDATE',
            changes: { field: 'password' }
        })

        return { success: true, message: 'Password changed successfully' }
    } catch (error) {
        logger.error('Failed to change password', { error })
        return { success: false, message: error instanceof Error ? error.message : 'Failed to change password' }
    }
}
