/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        photo: {
            create: vi.fn(),
        },
    },
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
    },
}))

const { mockWriteFile, mockMkdir } = vi.hoisted(() => ({
    mockWriteFile: vi.fn().mockResolvedValue(undefined),
    mockMkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('node:fs/promises', () => ({
    default: {
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
    },
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
}))

vi.mock('fs/promises', () => ({
    default: {
        writeFile: mockWriteFile,
        mkdir: mockMkdir,
    },
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
}))

import { uploadPhoto } from '../photos'

// ---------------------------------------------------------------------------
// Valid CUID-format IDs
// ---------------------------------------------------------------------------
const mockUserId = 'cm0000000000000000user001'
const mockInspectionId = 'cm00000000000inspection01'

/**
 * Creates a mock File with arrayBuffer() support for jsdom environment.
 * jsdom's File class does not implement arrayBuffer(), so we need this shim.
 */
function createMockFile(
    content: string | ArrayBuffer,
    name: string,
    options: { type: string }
): File {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content)
    const file = new File([data], name, options)
    // Shim arrayBuffer for jsdom
    if (!file.arrayBuffer) {
        file.arrayBuffer = () => Promise.resolve(data.buffer as ArrayBuffer)
    }
    return file
}

function createMockFormData(overrides: Record<string, any> = {}): FormData {
    const defaults: Record<string, any> = {
        file: createMockFile('fake-image-data', 'photo.jpg', { type: 'image/jpeg' }),
        inspectionId: mockInspectionId,
        caption: 'Test caption',
        category: 'General',
        id: 'offline-123',
    }
    const merged = { ...defaults, ...overrides }
    const formData = new FormData()
    for (const [key, value] of Object.entries(merged)) {
        if (value !== undefined && value !== null) {
            formData.append(key, value)
        }
    }
    return formData
}

describe('Photo Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(auth).mockResolvedValue({
            user: { id: mockUserId, role: 'INSPECTOR' },
        } as any)
    })

    describe('uploadPhoto', () => {
        it('should return error when not authenticated', async () => {
            vi.mocked(auth).mockResolvedValue(null as any)

            const result = await uploadPhoto(createMockFormData())

            expect(result).toEqual({ error: 'Unauthorized' })
        })

        it('should return error when file is missing', async () => {
            const formData = new FormData()
            formData.append('inspectionId', mockInspectionId)

            const result = await uploadPhoto(formData)

            expect(result).toEqual({ error: 'Missing file or inspection ID' })
        })

        it('should return error when inspectionId is missing', async () => {
            const formData = new FormData()
            formData.append('file', createMockFile('data', 'photo.jpg', { type: 'image/jpeg' }))

            const result = await uploadPhoto(formData)

            expect(result).toEqual({ error: 'Missing file or inspection ID' })
        })

        it('should reject invalid file types', async () => {
            const formData = createMockFormData({
                file: createMockFile('data', 'script.exe', { type: 'application/x-msdownload' }),
            })

            const result = await uploadPhoto(formData)

            expect(result).toEqual({
                error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.',
            })
        })

        it('should reject files larger than 10MB', async () => {
            // Create a file larger than 10MB
            const largeBuffer = new ArrayBuffer(11 * 1024 * 1024)
            const largeFile = createMockFile(largeBuffer, 'large.jpg', { type: 'image/jpeg' })
            const formData = createMockFormData({ file: largeFile })

            const result = await uploadPhoto(formData)

            expect(result).toEqual({ error: 'File too large. Maximum size is 10MB.' })
        })

        it('should reject invalid inspection ID format', async () => {
            const formData = createMockFormData({ inspectionId: 'invalid!' })

            const result = await uploadPhoto(formData)

            expect(result).toEqual({ error: 'Invalid inspection ID format' })
        })

        it('should upload photo successfully', async () => {
            vi.mocked(prisma.photo.create).mockResolvedValue({} as any)

            const result = await uploadPhoto(createMockFormData())

            expect(result.success).toBe(true)
            expect(result.url).toMatch(/^\/uploads\//)
            expect(result.offlineId).toBe('offline-123')
            expect(prisma.photo.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    url: expect.stringContaining('/uploads/'),
                    caption: 'Test caption',
                    category: 'General',
                    inspectionId: mockInspectionId,
                }),
            })
        })

        it('should handle database errors', async () => {
            vi.mocked(prisma.photo.create).mockRejectedValue(new Error('DB Error'))

            const result = await uploadPhoto(createMockFormData())

            expect(result).toEqual({ error: 'Failed to upload photo' })
        })
    })
})
