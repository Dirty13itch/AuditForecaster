'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"

const UserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["ADMIN", "INSPECTOR", "QA"]),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .optional(),
})

async function checkAdmin() {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role
    if (role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required')
    }
}

export async function createUser(_prevState: unknown, formData: FormData) {
    try {
        await checkAdmin()

        const rawData = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            password: formData.get('password') || undefined,
        }

        const validatedFields = UserSchema.parse(rawData)

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedFields.email }
        })

        if (existingUser) {
            return { message: 'User with this email already exists' }
        }

        // Require password for new users - no weak defaults
        if (!validatedFields.password) {
            return { message: 'Password is required for new users' }
        }
        const passwordHash = await bcrypt.hash(validatedFields.password, 10)

        await prisma.user.create({
            data: {
                name: validatedFields.name,
                email: validatedFields.email,
                role: validatedFields.role,
                passwordHash: passwordHash,
            }
        })

        revalidatePath('/dashboard/team/users')
        return { message: 'User created successfully' }
    } catch (e: unknown) {
        logger.error('Failed to create user', { error: e })
        return { message: e instanceof Error ? e.message : 'Failed to create user' }
    }
}

export async function updateUser(id: string, _prevState: unknown, formData: FormData) {
    try {
        await checkAdmin()

        const rawData = {
            name: formData.get('name'),
            email: formData.get('email'),
            role: formData.get('role'),
            password: formData.get('password') || undefined,
        }

        const validatedFields = UserSchema.parse(rawData)

        const updateData: { name: string; email: string; role: string; passwordHash?: string } = {
            name: validatedFields.name,
            email: validatedFields.email,
            role: validatedFields.role,
        }

        if (validatedFields.password) {
            updateData.passwordHash = await bcrypt.hash(validatedFields.password, 10)
        }

        await prisma.user.update({
            where: { id },
            data: updateData
        })

        revalidatePath('/dashboard/team/users')
        return { message: 'User updated successfully' }
    } catch (e: unknown) {
        logger.error('Failed to create user', { error: e })
        return { message: e instanceof Error ? e.message : 'Failed to update user' }
    }
}

export async function deleteUser(id: string) {
    try {
        await checkAdmin()

        await prisma.user.delete({
            where: { id }
        })
        revalidatePath('/dashboard/team/users')
        return { message: 'User deleted successfully' }
    } catch (e: unknown) {
        logger.error('Failed to delete user', { error: e })
        return { message: e instanceof Error ? e.message : 'Failed to delete user' }
    }
}
