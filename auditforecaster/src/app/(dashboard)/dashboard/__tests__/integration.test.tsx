import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import BuilderSchedulePage from '../builder/schedule/page'
import EquipmentPage from '../assets/equipment/page'
import FleetPage from '../assets/fleet/page'
import { prisma } from '@/lib/prisma'

// Mock Next.js Link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Calendar: () => <div data-testid="calendar-icon" />,
    ClipboardList: () => <div data-testid="clipboard-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    Search: () => <div data-testid="search-icon" />,
    Filter: () => <div data-testid="filter-icon" />,
    X: () => <div data-testid="x-icon" />,
    Printer: () => <div data-testid="printer-icon" />,
    Car: () => <div data-testid="car-icon" />,
    Wrench: () => <div data-testid="wrench-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
    CheckCircle: () => <div data-testid="check-circle-icon" />,
    MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
    Edit: () => <div data-testid="edit-icon" />,
    Trash: () => <div data-testid="trash-icon" />,
    ChevronRight: () => <div data-testid="chevron-right-icon" />,
    ChevronLeft: () => <div data-testid="chevron-left-icon" />,
    ChevronsLeft: () => <div data-testid="chevrons-left-icon" />,
    ChevronsRight: () => <div data-testid="chevrons-right-icon" />,
    Gauge: () => <div data-testid="gauge-icon" />,
    MapPin: () => <div data-testid="map-pin-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    User: () => <div data-testid="user-icon" />,
    LogOut: () => <div data-testid="log-out-icon" />,
    Menu: () => <div data-testid="menu-icon" />,
}))

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: '1', builderId: 'builder-1' } })
}))

// Mock sync provider
vi.mock('@/providers/sync-provider', () => ({
    useSync: vi.fn().mockReturnValue({
        engine: {
            enqueue: vi.fn().mockResolvedValue(true)
        }
    })
}))

// Mock env
vi.mock('@/lib/env', () => ({
    env: {
        NEXTAUTH_URL: 'http://localhost:3000',
        DATABASE_URL: 'postgres://localhost:5432/db',
        NEXTAUTH_SECRET: 'secret'
    }
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn()
    })
}))

describe('Dashboard Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Builder Schedule Page', () => {
        it('renders schedule page with jobs', async () => {
            vi.mocked(prisma.job.findMany).mockResolvedValue([
                {
                    id: '1',
                    lotNumber: '123',
                    streetAddress: 'Main St',
                    scheduledDate: new Date(),
                    status: 'Scheduled',
                    builder: { name: 'Test Builder' }
                }
            ] as any)

            const Page = await BuilderSchedulePage()
            render(Page)

            expect(screen.getByText('Builder Schedule')).toBeInTheDocument()
            expect(screen.getByText('Upcoming Jobs')).toBeInTheDocument()
            expect(screen.getByText('123 - Main St')).toBeInTheDocument()
        })
    })

    describe('Equipment Page', () => {
        it('renders equipment page with items', async () => {
            vi.mocked(prisma.equipment.findMany).mockResolvedValue([
                { id: '1', name: 'Blower Door', type: 'Testing', status: 'Active' }
            ] as any)

            render(await EquipmentPage())
            expect(screen.getByText('Equipment')).toBeInTheDocument()
            expect(screen.getByText('Blower Door')).toBeInTheDocument()
            expect(screen.getByText('Active')).toBeInTheDocument()
        })
    })

    describe('FleetPage', () => {
        it('renders fleet page with vehicles', async () => {
            vi.mocked(prisma.vehicle.findMany).mockResolvedValue([
                { id: '1', name: 'Truck 1', licensePlate: 'ABC-123', status: 'Active', mileage: 50000 }
            ] as any)
            vi.mocked(prisma.user.findMany).mockResolvedValue([
                { id: '1', name: 'Test User' }
            ] as any)

            render(await FleetPage())
            expect(screen.getByText('Fleet')).toBeInTheDocument()
            expect(screen.getByText('Truck 1')).toBeInTheDocument()
            expect(screen.getByText('ABC-123')).toBeInTheDocument()
        })
    })
})
