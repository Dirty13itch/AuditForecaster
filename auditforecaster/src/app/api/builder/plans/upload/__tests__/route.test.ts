/**
 * @jest-environment node
 */
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { writeFile } from 'fs/promises';

interface MockResponse {
    body?: string;
    status: number;
    headers?: Map<string, string>;
}

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        plan: {
            create: jest.fn(),
        },
    },
}));

jest.mock('@/auth', () => ({
    auth: jest.fn(),
}));

jest.mock('fs/promises', () => ({
    writeFile: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => {
    return {
        NextResponse: class {
            body?: string;
            status: number;

            constructor(body: string, init?: { status?: number }) {
                this.body = body;
                this.status = init?.status || 200;
            }
            static json(body: Record<string, unknown>, init?: { status?: number }): MockResponse {
                return {
                    body: JSON.stringify(body),
                    status: init?.status || 200,
                    headers: new Map([['content-type', 'application/json']]),
                };
            }
        },
    };
});

describe('Plan Upload API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if not authenticated', async () => {
        (auth as jest.Mock).mockResolvedValue(null);
        const req = {
            formData: jest.fn(),
        } as unknown as Request;
        const res = await POST(req) as unknown as MockResponse;
        expect(res.status).toBe(401);
    });

    it('should return 400 if missing fields', async () => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: '1' } });
        const formData = new Map();
        // Empty map
        const req = {
            formData: jest.fn().mockResolvedValue(formData),
        } as unknown as Request;

        const res = await POST(req) as unknown as MockResponse;
        expect(res.status).toBe(400);
    });

    it('should create plan and return 200 on success', async () => {
        (auth as jest.Mock).mockResolvedValue({ user: { id: '1' } });
        (prisma.plan.create as jest.Mock).mockResolvedValue({ id: 'plan-1', title: 'Test Plan' });
        (writeFile as jest.Mock).mockResolvedValue(undefined);

        const formData = new Map();
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        formData.set('file', file);
        formData.set('builderId', 'builder-1');
        formData.set('title', 'Test Plan');
        formData.set('description', 'Test Description');

        const req = {
            formData: jest.fn().mockResolvedValue(formData),
        } as unknown as Request;

        const res = await POST(req) as unknown as MockResponse;
        expect(res.status).toBe(200);
        expect(prisma.plan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                title: 'Test Plan',
                builderId: 'builder-1',
            }),
        }));
    });
});
