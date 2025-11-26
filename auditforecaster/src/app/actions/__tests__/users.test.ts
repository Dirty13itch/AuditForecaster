import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUser, updateUser, deleteUser } from '../users'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn()
    }
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('Users Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({ user: { role: 'ADMIN' } } as any)
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as any)
    })

    describe('createUser', () => {
        it('should create user successfully', async () => {
            const formData = new FormData()
            formData.append('name', 'John Doe')
            formData.append('email', 'john@example.com')
            formData.append('role', 'INSPECTOR')
            formData.append('password', 'password123')

            vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
            vi.mocked(prisma.user.create).mockResolvedValue({ id: 'user-1' } as any)

            const result = await createUser(null, formData)

            expect(result.message).toBe('User created successfully')
            expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    email: 'john@example.com',
                    passwordHash: 'hashed-password'
                })
            }))
        })

        it('should fail if not admin', async () => {
            vi.mocked(auth).mockResolvedValue({ user: { role: 'INSPECTOR' } } as any)
            const formData = new FormData()

            const result = await createUser(null, formData)
            expect(result.message).toContain('Unauthorized')
        })

        it('should fail if email exists', async () => {
            const formData = new FormData()
            formData.append('name', 'John Doe')
            formData.append('email', 'john@example.com')
            formData.append('role', 'INSPECTOR')

            vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any)

            const result = await createUser(null, formData)
            expect(result.message).toBe('User with this email already exists')
        })
    })

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            const formData = new FormData()
            formData.append('name', 'John Updated')
            formData.append('email', 'john@example.com')
            formData.append('role', 'INSPECTOR')

            const result = await updateUser('user-1', null, formData)

            expect(result.message).toBe('User updated successfully')
            expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'user-1' },
                data: expect.objectContaining({ name: 'John Updated' })
            }))
        })
    })

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const result = await deleteUser('user-1')

            expect(result.message).toBe('User deleted successfully')
            expect(prisma.user.delete).toHaveBeenCalledWith({
                where: { id: 'user-1' }
            })
        })
    })
})
