/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateProfile, changePassword } from '../user'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { hash, compare } from 'bcryptjs'

const USER_ID = 'cm0000000000000000user001'
const OTHER_USER_ID = 'cm0000000000000000user002'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
    },
}))

vi.mock('@/lib/audit', () => ({
    logAudit: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
    hash: vi.fn(),
    compare: vi.fn(),
}))

describe('user actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: USER_ID, role: 'ADMIN', email: 'admin@test.com' },
        } as any)
        // Re-establish bcryptjs mocks after clearAllMocks
        vi.mocked(hash).mockResolvedValue('$2a$12$hashedpassword' as never)
        vi.mocked(compare).mockResolvedValue(false as never)
    })

    // -----------------------------------------------------------------------
    // updateProfile
    // -----------------------------------------------------------------------
    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({ email: 'admin@test.com' } as any) // current user lookup
            vi.mocked(prisma.user.update).mockResolvedValue({ id: USER_ID } as any)

            const formData = new FormData()
            formData.set('name', 'John Doe')
            formData.set('email', 'admin@test.com')
            formData.set('phone', '555-1234')

            const result = await updateProfile(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Profile updated successfully')
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: USER_ID },
                data: { name: 'John Doe', email: 'admin@test.com' },
            })
        })

        it('should reject duplicate email', async () => {
            vi.mocked(prisma.user.findUnique)
                .mockResolvedValueOnce({ email: 'admin@test.com' } as any) // current user
                .mockResolvedValueOnce({ id: OTHER_USER_ID } as any) // email already taken

            const formData = new FormData()
            formData.set('name', 'John Doe')
            formData.set('email', 'taken@test.com')
            formData.set('phone', '555-1234')

            const result = await updateProfile(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Email already in use')
            expect(prisma.user.update).not.toHaveBeenCalled()
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const formData = new FormData()
            formData.set('name', 'Test')
            formData.set('email', 'test@test.com')

            await expect(updateProfile(formData)).rejects.toThrow('Unauthorized')
        })

        it('should return error for invalid email format', async () => {
            const formData = new FormData()
            formData.set('name', 'John')
            formData.set('email', 'not-an-email')

            const result = await updateProfile(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Failed to update profile')
        })

        it('should return error for empty name', async () => {
            const formData = new FormData()
            formData.set('name', '')
            formData.set('email', 'valid@test.com')

            const result = await updateProfile(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Failed to update profile')
        })
    })

    // -----------------------------------------------------------------------
    // changePassword
    // -----------------------------------------------------------------------
    describe('changePassword', () => {
        it('should change password when current password is correct', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: USER_ID,
                passwordHash: '$2a$12$existinghash',
            } as any)
            vi.mocked(compare).mockResolvedValue(true as never)
            vi.mocked(prisma.user.update).mockResolvedValue({ id: USER_ID } as any)

            const formData = new FormData()
            formData.set('currentPassword', 'oldpass123')
            formData.set('newPassword', 'newpass1234')

            const result = await changePassword(formData)

            expect(result.success).toBe(true)
            expect(result.message).toBe('Password changed successfully')
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: USER_ID },
                data: {
                    passwordHash: '$2a$12$hashedpassword',
                    tokenVersion: { increment: 1 },
                },
            })
        })

        it('should reject incorrect current password', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: USER_ID,
                passwordHash: '$2a$12$existinghash',
            } as any)
            vi.mocked(compare).mockResolvedValue(false as never)

            const formData = new FormData()
            formData.set('currentPassword', 'wrongpass')
            formData.set('newPassword', 'newpass1234')

            const result = await changePassword(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Incorrect current password')
            expect(prisma.user.update).not.toHaveBeenCalled()
        })

        it('should throw Unauthorized when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null)

            const formData = new FormData()
            formData.set('currentPassword', 'old')
            formData.set('newPassword', 'newpass1234')

            await expect(changePassword(formData)).rejects.toThrow('Unauthorized')
        })

        it('should return error when new password is too short', async () => {
            const formData = new FormData()
            formData.set('currentPassword', 'oldpass123')
            formData.set('newPassword', 'short')

            const result = await changePassword(formData)

            expect(result.success).toBe(false)
            expect(result.message).toBe('Failed to change password')
        })
    })
})
