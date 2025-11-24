import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InspectionForm } from '../inspection-form'
import { updateInspection } from '@/app/actions/inspections'

// Mock dependencies
jest.mock('@/app/actions/inspections', () => ({
    updateInspection: jest.fn(),
}))

jest.mock('@/components/ui/use-toast', () => ({
    useToast: jest.fn(() => ({ toast: jest.fn() })),
}))

jest.mock('@/hooks/use-offline-sync', () => ({
    useOfflineSync: () => ({
        isOffline: false,
        lastSaved: null,
        offlineData: null,
        saveDraft: jest.fn()
    })
}))

// Mock child components to avoid deep rendering issues
jest.mock('@/components/photo-upload', () => ({
    PhotoUpload: () => <div data-testid="photo-upload">Photo Upload Component</div>
}))

jest.mock('@/components/checklist-section', () => ({
    ChecklistSection: () => <div data-testid="checklist-section">Checklist Section Component</div>
}))

jest.mock('@/components/signature-pad', () => ({
    SignaturePad: () => <div data-testid="signature-pad">Signature Pad Component</div>
}))

describe('InspectionForm', () => {
    const mockJobId = 'job-123'
    const mockInitialData = {
        checklist: [],
        signatureUrl: undefined,
        cfm50: 1000,
        notes: 'Test notes'
    }

    it('renders correctly with initial data', () => {
        render(<InspectionForm jobId={mockJobId} initialData={mockInitialData} />)

        expect(screen.getByText('Blower Door Test Results')).toBeInTheDocument()
        expect(screen.getByLabelText('CFM @ 50Pa')).toHaveValue(1000)
        expect(screen.getByText('Test notes')).toBeInTheDocument()
        // Photo upload requires inspectionId which we don't provide in this test
        expect(screen.getByTestId('checklist-section')).toBeInTheDocument()
    })

    it('submits inspection data', async () => {
        const mockUpdateInspection = updateInspection as jest.Mock
        mockUpdateInspection.mockResolvedValue(undefined)

        render(<InspectionForm jobId={mockJobId} initialData={mockInitialData} />)

        const submitBtn = screen.getByRole('button', { name: /Complete Inspection/i })
        fireEvent.click(submitBtn)

        await waitFor(() => {
            expect(mockUpdateInspection).toHaveBeenCalled()
        })
    })
})
