'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { auth } from "@/auth"
import { z } from "zod"

const ProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
})

export async function updateProfile(prevState: unknown, formData: FormData) {
    try {
        const session = await auth()
        if (!session?.user?.email) {
            return { message: 'Not authenticated' }
        }

        const rawData = {
            name: formData.get('name'),
            email: formData.get('email'),
        }

        const validatedFields = ProfileSchema.parse(rawData)

        // Find user by current email
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user) {
            return { message: 'User not found' }
        }

        // If email is changing, check if new email is taken
        if (validatedFields.email !== user.email) {
            const existing = await prisma.user.findUnique({
                where: { email: validatedFields.email }
            })
            if (existing) {
                return { message: 'Email already in use' }
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                name: validatedFields.name,
                email: validatedFields.email,
            }
        })

        revalidatePath('/dashboard/settings')
        return { message: 'Profile updated successfully' }
    } catch (e) {
        logger.error('Failed to update settings', { error: e })
        return { message: 'Failed to update profile' }
    }
}
