'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"

const UserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["ADMIN", "INSPECTOR", "QA"]),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
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

        const passwordHash = validatedFields.password
            ? await bcrypt.hash(validatedFields.password, 10)
            : await bcrypt.hash('password123', 10) // Default password if not provided

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
        console.error(e)
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
        console.error(e)
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
        console.error(e)
        return { message: e instanceof Error ? e.message : 'Failed to delete user' }
    }
}
