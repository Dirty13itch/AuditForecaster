/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import BuilderSchedulePage from '../builder/schedule/page'
import EquipmentPage from '../assets/equipment/page'
import FleetPage from '../assets/fleet/page'

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
    prisma: {
        equipment: {
            findMany: vi.fn().mockResolvedValue([
                { id: '1', name: 'Blower Door', type: 'Testing', status: 'Active' },
            ]),
        },
        vehicle: {
            findMany: vi.fn().mockResolvedValue([
                { id: '1', name: 'Truck 1', licensePlate: 'ABC-123', status: 'Active', mileage: 50000 },
            ]),
        },
        job: {
            findMany: vi.fn().mockResolvedValue([
                {
                    id: '1',
                    lotNumber: '123',
                    streetAddress: 'Main St',
                    scheduledDate: new Date(),
                    status: 'Scheduled',
                    builder: { name: 'Test Builder' }
                }
            ])
        }
    },
}))

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
}))

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: '1', builderId: 'builder-1' } })
}))

describe('Dashboard Integration Tests', () => {
    describe('Builder Schedule Page', () => {
        it('renders schedule page with jobs', async () => {
            const Page = await BuilderSchedulePage()
            render(Page)

            expect(screen.getByText('Builder Schedule')).toBeInTheDocument()
            expect(screen.getByText('Upcoming Jobs')).toBeInTheDocument()
            expect(screen.getByText('123 - Main St')).toBeInTheDocument()
        })
    })

    describe('Equipment Page', () => {
        it('renders equipment list', async () => {
            const Page = await EquipmentPage()
            render(Page)

            expect(screen.getByText('Equipment')).toBeInTheDocument()
            expect(screen.getByText('Blower Door')).toBeInTheDocument()
            expect(screen.getByText('Testing')).toBeInTheDocument()
        })
    })

    describe('Fleet Page', () => {
        it('renders fleet list', async () => {
            const Page = await FleetPage()
            render(Page)

            expect(screen.getByText('Fleet')).toBeInTheDocument()
            expect(screen.getByText('Truck 1')).toBeInTheDocument()
            expect(screen.getByText('ABC-123')).toBeInTheDocument()
        })
    })
})
