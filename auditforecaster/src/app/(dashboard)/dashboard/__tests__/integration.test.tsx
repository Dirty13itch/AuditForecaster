import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import EquipmentPage from '../equipment/page'
import { prisma } from '@/lib/prisma'
import { Equipment } from '@prisma/client'

// Mock Next.js Link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Wrench: () => <div data-testid="wrench-icon" />,
    User: () => <div data-testid="user-icon" />,
    ArrowRightLeft: () => <div data-testid="arrow-icon" />,
}))

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: '1', role: 'ADMIN' } })
}))

// Mock sonner
vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
    usePathname: () => '/dashboard/equipment',
}))

describe('Dashboard Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Equipment Page', () => {
        it('renders equipment page with items', async () => {
            vi.mocked(prisma.equipment.findMany).mockResolvedValue([
                { id: '1', name: 'Blower Door', type: 'Testing', status: 'ACTIVE', serialNumber: 'SN-001', assignedTo: null, assignedUser: null }
            ] as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([
                { id: 'u1', name: 'Shaun' }
            ] as any)

            render(await EquipmentPage())
            expect(screen.getByText('Equipment')).toBeInTheDocument()
            expect(screen.getByText('Blower Door')).toBeInTheDocument()
        })
    })
})
