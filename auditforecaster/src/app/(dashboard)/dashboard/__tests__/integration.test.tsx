/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import BuilderSchedulePage from '../builder/schedule/page';
import EquipmentPage from '../assets/equipment/page';
import FleetPage from '../assets/fleet/page';

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
    prisma: {
        equipment: {
            findMany: jest.fn().mockResolvedValue([
                { id: '1', name: 'Blower Door', type: 'Testing', status: 'Active' },
            ]),
        },
        vehicle: {
            findMany: jest.fn().mockResolvedValue([
                { id: '1', name: 'Truck 1', licensePlate: 'ABC-123', status: 'Active' },
            ]),
        },
    },
}));

// Mock Next.js Link
const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
);
MockLink.displayName = 'MockLink';

jest.mock('next/link', () => MockLink);

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Calendar: () => <div data-testid="calendar-icon" />,
    ClipboardList: () => <div data-testid="clipboard-icon" />,
}));

describe('Dashboard Integration Tests', () => {
    describe('Builder Schedule Page', () => {
        it('renders schedule page with jobs', async () => {
            const Page = await BuilderSchedulePage();
            render(Page);

            expect(screen.getByText('Builder Schedule')).toBeInTheDocument();
            expect(screen.getByText('Upcoming Jobs')).toBeInTheDocument();
            expect(screen.getByText('Foundation Inspection')).toBeInTheDocument();
        });
    });

    describe('Equipment Page', () => {
        it('renders equipment list', async () => {
            const Page = await EquipmentPage();
            render(Page);

            expect(screen.getByText('Equipment')).toBeInTheDocument();
            expect(screen.getByText('Blower Door')).toBeInTheDocument();
            expect(screen.getByText('Testing')).toBeInTheDocument();
        });
    });

    describe('Fleet Page', () => {
        it('renders fleet list', async () => {
            const Page = await FleetPage();
            render(Page);

            expect(screen.getByText('Fleet')).toBeInTheDocument();
            expect(screen.getByText('Truck 1')).toBeInTheDocument();
            expect(screen.getByText('ABC-123')).toBeInTheDocument();
        });
    });
});
