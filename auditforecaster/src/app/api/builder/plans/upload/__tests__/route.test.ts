import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        plan: {
            create: vi.fn(),
        }
    }
}))

vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

vi.mock('fs/promises', () => ({
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    default: {
        writeFile: vi.fn(),
        mkdir: vi.fn(),
    }
}))

vi.mock('next/server', () => {
    return {
        NextResponse: class {
            status: number
            constructor(body: any, init?: any) {
                this.status = init?.status || 200
            }
            static json(body: any, init?: any) {
                return {
                    json: async () => body,
                    status: init?.status || 200,
                }
            }
        }
    }
})

describe('Plan Upload API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return 401 if not authenticated', async () => {
        vi.mocked(auth).mockResolvedValue(null)
        const req = {
            formData: vi.fn(),
        } as unknown as Request

        const res = await POST(req)
        expect(res.status).toBe(401)
    })

    it('should return 400 if missing fields', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: '1' } } as any)
        const formData = new Map()
        // Empty map
        const req = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request

        const res = await POST(req)
        expect(res.status).toBe(400)
    })

    it('should create plan and return 200 on success', async () => {
        vi.mocked(auth).mockResolvedValue({ user: { id: '1', role: 'ADMIN' } } as any)
        vi.mocked(prisma.plan.create).mockResolvedValue({ id: 'plan-1', title: 'Test Plan' } as any)
        vi.mocked(writeFile).mockResolvedValue(undefined)

        const formData = new Map()
        const file = {
            name: 'test.pdf',
            type: 'application/pdf',
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
            size: 1024
        }
        formData.set('file', file)
        formData.set('builderId', '00000000-0000-0000-0000-000000000001')
        formData.set('title', 'Test Plan')
        formData.set('description', 'Test Description')

        const req = {
            formData: vi.fn().mockResolvedValue(formData),
        } as unknown as Request

        const res = await POST(req)
        expect(res.status).toBe(200)
        expect(prisma.plan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                title: 'Test Plan',
                builderId: '00000000-0000-0000-0000-000000000001',
            }),
        }))
    })
})
