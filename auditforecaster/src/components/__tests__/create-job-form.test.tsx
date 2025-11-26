import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateJobForm } from '../create-job-form'
import { createJob } from '@/app/actions/jobs'
import { vi, describe, it, expect } from 'vitest'

// Mock dependencies
vi.mock('@/app/actions/jobs', () => ({
    createJob: vi.fn(),
}))

vi.mock('@/components/ui/use-toast', () => ({
    useToast: vi.fn(() => ({ toast: vi.fn() })),
}))

// Mock Radix UI Select to simplify testing
type MockProps = {
    children?: React.ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

vi.mock('@/components/ui/select', () => ({
    Select: ({ children }: MockProps) => <div data-testid="select">{children}</div>,
    SelectTrigger: ({ children }: MockProps) => <button>{children}</button>,
    SelectValue: ({ placeholder }: MockProps) => <span>{placeholder}</span>,
    SelectContent: ({ children }: MockProps) => <div>{children}</div>,
    SelectItem: ({ children, value, onClick }: MockProps) => <div onClick={() => onClick?.(value)}>{children}</div>,
}))

const mockBuilders = [{ id: 'b1', name: 'Builder One', email: 'b1@test.com', phone: '123', address: '123', contactInfo: null, paymentTerms: null, createdAt: new Date(), updatedAt: new Date() }]
const mockInspectors = [{ id: 'i1', name: 'Inspector One', email: 'i1@test.com', role: 'INSPECTOR', emailVerified: null, image: null, createdAt: new Date(), updatedAt: new Date(), passwordHash: 'hash' }]

describe('CreateJobForm', () => {
    it('renders all form fields', () => {
        render(<CreateJobForm builders={mockBuilders} inspectors={mockInspectors} />)

        expect(screen.getByPlaceholderText('Lot Number')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Street Address')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('City')).toBeInTheDocument()
        expect(screen.getByText('Select Builder')).toBeInTheDocument()
        expect(screen.getByText('Assign Inspector (Optional)')).toBeInTheDocument()
        expect(screen.getByText('Schedule Job')).toBeInTheDocument()
    })

    it('submits form with data', async () => {
        const mockCreateJob = vi.mocked(createJob)
        mockCreateJob.mockResolvedValue(undefined as any)

        render(<CreateJobForm builders={mockBuilders} inspectors={mockInspectors} />)

        fireEvent.change(screen.getByPlaceholderText('Lot Number'), { target: { value: '123' } })
        fireEvent.change(screen.getByPlaceholderText('Street Address'), { target: { value: 'Main St' } })
        fireEvent.change(screen.getByPlaceholderText('City'), { target: { value: 'Test City' } })

        const submitBtn = screen.getByText('Schedule Job')
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockCreateJob).toHaveBeenCalled()
        })
    })
})
