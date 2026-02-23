import { render, screen } from '@testing-library/react'
import { KPICards } from '../analytics/kpi-cards'
import { describe, it, expect } from 'vitest'

describe('KPICards', () => {
    const defaultMetrics = {
        revenue: 50000,
        costs: 30000,
        netProfit: 20000,
        margin: 40,
        inspectionCount: 125,
    }

    it('renders all four KPI cards', () => {
        render(<KPICards metrics={defaultMetrics} />)

        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
        expect(screen.getByText('Net Profit')).toBeInTheDocument()
        expect(screen.getByText('Inspections')).toBeInTheDocument()
        expect(screen.getByText('Total Costs')).toBeInTheDocument()
    })

    it('displays inspection count', () => {
        render(<KPICards metrics={defaultMetrics} />)
        expect(screen.getByText('125')).toBeInTheDocument()
    })

    it('displays margin percentage', () => {
        render(<KPICards metrics={defaultMetrics} />)
        expect(screen.getByText('40.0% Margin')).toBeInTheDocument()
    })

    it('shows green text for positive profit', () => {
        render(<KPICards metrics={defaultMetrics} />)
        const profitElement = screen.getByText('40.0% Margin').previousElementSibling
        expect(profitElement?.className).toContain('text-green-600')
    })

    it('shows red text for negative profit', () => {
        render(<KPICards metrics={{ ...defaultMetrics, netProfit: -5000, margin: -10 }} />)
        const marginText = screen.getByText('-10.0% Margin')
        const profitElement = marginText.previousElementSibling
        expect(profitElement?.className).toContain('text-red-600')
    })

    it('renders with zero values', () => {
        render(<KPICards metrics={{
            revenue: 0,
            costs: 0,
            netProfit: 0,
            margin: 0,
            inspectionCount: 0,
        }} />)

        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('0.0% Margin')).toBeInTheDocument()
    })
})
