import { render, screen, fireEvent } from '@testing-library/react'
import { AppSidebar } from '../app-sidebar'
import { vi, describe, it, expect } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/dashboard'),
}))

describe('AppSidebar', () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined)

    it('renders the company name', () => {
        render(<AppSidebar userRole="ADMIN" onSignOut={mockSignOut} />)
        expect(screen.getByText('Ulrich Energy')).toBeInTheDocument()
    })

    it('renders Dashboard link for ADMIN', () => {
        render(<AppSidebar userRole="ADMIN" onSignOut={mockSignOut} />)
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders Sign Out button', () => {
        render(<AppSidebar userRole="ADMIN" onSignOut={mockSignOut} />)
        expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('shows admin-only items for ADMIN role', () => {
        render(<AppSidebar userRole="ADMIN" onSignOut={mockSignOut} />)
        expect(screen.getByText('Analytics')).toBeInTheDocument()
        expect(screen.getByText('Builders')).toBeInTheDocument()
        expect(screen.getByText('Reports')).toBeInTheDocument()
        expect(screen.getByText('Finances')).toBeInTheDocument()
    })

    it('hides admin-only items for INSPECTOR role', () => {
        render(<AppSidebar userRole="INSPECTOR" onSignOut={mockSignOut} />)
        expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
        expect(screen.queryByText('Builders')).not.toBeInTheDocument()
        expect(screen.queryByText('Finances')).not.toBeInTheDocument()
    })

    it('shows Jobs for INSPECTOR role', () => {
        render(<AppSidebar userRole="INSPECTOR" onSignOut={mockSignOut} />)
        expect(screen.getByText('Jobs')).toBeInTheDocument()
    })

    it('shows Builder Portal for BUILDER role', () => {
        render(<AppSidebar userRole="BUILDER" onSignOut={mockSignOut} />)
        expect(screen.getByText('Builder Portal')).toBeInTheDocument()
    })

    it('shows QA Review for QA role', () => {
        render(<AppSidebar userRole="QA" onSignOut={mockSignOut} />)
        expect(screen.getByText('QA Review')).toBeInTheDocument()
    })

    it('expands collapsible items on click', () => {
        render(<AppSidebar userRole="ADMIN" onSignOut={mockSignOut} />)

        const jobsButton = screen.getByText('Jobs')
        fireEvent.click(jobsButton)

        expect(screen.getByText('All Jobs')).toBeInTheDocument()
        expect(screen.getByText('Schedule')).toBeInTheDocument()
    })

    it('shows Settings for all roles', () => {
        const roles = ['ADMIN', 'INSPECTOR', 'QA', 'BUILDER']
        for (const role of roles) {
            const { unmount } = render(<AppSidebar userRole={role} onSignOut={mockSignOut} />)
            expect(screen.getByText('Settings')).toBeInTheDocument()
            unmount()
        }
    })
})
