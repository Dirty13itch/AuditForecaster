import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUser, updateUser, deleteUser } from '../users'
import { prismaMock } from '@/test/mocks/prisma'
import { mockSession } from '@/test/mocks/auth'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

vi.mock('@/auth', () => ({
    auth: vi.fn()
}))

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn()
}))

describe('users actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default to admin session
        vi.mocked(auth).mockResolvedValue(mockSession as any)
    })

    describe('createUser', () => {
        it('should create user with valid data', async () => {
            const formData = new FormData()
            formData.set('name', 'New User')
            formData.set('email', 'new@example.com')
            formData.set('role', 'INSPECTOR')
            formData.set('password', 'password123')

            prismaMock.user.findUnique.mockResolvedValue(null)
            prismaMock.user.create.mockResolvedValue({
                id: 'user-1',
                name: 'New User',
                email: 'new@example.com',
                role: 'INSPECTOR'
            } as any)

            const result = await createUser(null, formData)

            expect(result.message).toBe('User created successfully')
            expect(prismaMock.user.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    name: 'New User',
                    email: 'new@example.com',
                    passwordHash: 'hashed_password'
                })
            })
        })

        it('should fail if user already exists', async () => {
            const formData = new FormData()
            formData.set('name', 'New User')
            formData.set('email', 'existing@example.com')
            formData.set('role', 'INSPECTOR')

            prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' } as any)

            const result = await createUser(null, formData)

            expect(result.message).toBe('User with this email already exists')
            expect(prismaMock.user.create).not.toHaveBeenCalled()
        })

        it('should fail if not admin', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { role: 'INSPECTOR' }
            } as any)

            const formData = new FormData()

            const result = await createUser(null, formData)
            expect(result.message).toContain('Unauthorized')
        })
    })

    describe('updateUser', () => {
        it('should update user details', async () => {
            const formData = new FormData()
            formData.set('name', 'Updated User')
            formData.set('email', 'updated@example.com')
            formData.set('role', 'QA')

            prismaMock.user.update.mockResolvedValue({
                id: 'user-1',
                name: 'Updated User'
            } as any)

            const result = await updateUser('user-1', null, formData)

            expect(result.message).toBe('User updated successfully')
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    name: 'Updated User',
                    role: 'QA'
                })
            })
        })

        it('should hash password if provided during update', async () => {
            const formData = new FormData()
            formData.set('name', 'User')
            formData.set('email', 'user@example.com')
            formData.set('role', 'INSPECTOR')
            formData.set('password', 'newpassword')

            await updateUser('user-1', null, formData)

            expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10)
            expect(prismaMock.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: expect.objectContaining({
                    passwordHash: 'hashed_password'
                })
            })
        })
    })

    describe('deleteUser', () => {
        it('should delete user', async () => {
            prismaMock.user.delete.mockResolvedValue({ id: 'user-1' } as any)

            const result = await deleteUser('user-1')

            expect(result.message).toBe('User deleted successfully')
            expect(prismaMock.user.delete).toHaveBeenCalledWith({
                where: { id: 'user-1' }
            })
        })

        it('should fail if not admin', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { role: 'INSPECTOR' }
            } as any)

            const result = await deleteUser('user-1')
            expect(result.message).toContain('Unauthorized')
        })
    })
})
