import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Jobs from '../Jobs';
import { useAuth } from '@/hooks/useAuth';

// Mock the required hooks and components
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()]
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/components/JobCard', () => ({
  default: () => <div>Job Card</div>
}));

vi.mock('@/components/ExportDialog', () => ({
  default: () => <div>Export Dialog</div>
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('Jobs Page - Create Job Button', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  beforeEach(() => {
    // Mock authenticated admin user
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'test-admin',
        email: 'admin@test.com',
        role: 'admin'
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn()
    } as any);
  });

  it('should render the Create Job button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    const createButton = screen.getByTestId('button-create-job');
    expect(createButton).toBeDefined();
    expect(createButton.textContent).toContain('Create Job');
  });

  it('should open the job creation modal when Create Job button is clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    // Initially, the modal should not be visible
    expect(screen.queryByTestId('modal-new-job')).toBeNull();

    // Click the Create Job button
    const createButton = screen.getByTestId('button-create-job');
    fireEvent.click(createButton);

    // Wait for the modal to appear
    await waitFor(() => {
      const modal = screen.getByTestId('modal-new-job');
      expect(modal).toBeDefined();
    });

    // Check that the form is present
    const form = screen.getByTestId('form-create-job');
    expect(form).toBeDefined();

    // Check for important form fields
    expect(screen.getByTestId('input-job-name')).toBeDefined();
    expect(screen.getByTestId('input-contractor')).toBeDefined();
    expect(screen.getByTestId('input-address')).toBeDefined();
    expect(screen.getByTestId('select-inspection-type')).toBeDefined();
  });

  it('should close the modal when Cancel button is clicked', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    // Open the modal
    const createButton = screen.getByTestId('button-create-job');
    fireEvent.click(createButton);

    // Wait for the modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('modal-new-job')).toBeDefined();
    });

    // Click the cancel button
    const cancelButton = screen.getByTestId('button-cancel');
    fireEvent.click(cancelButton);

    // Wait for the modal to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('modal-new-job')).toBeNull();
    });
  });

  it('should not show Create Job button for viewer role', () => {
    // Mock viewer user
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'test-viewer',
        email: 'viewer@test.com',
        role: 'viewer'
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn()
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <Jobs />
      </QueryClientProvider>
    );

    // Create Job button should not be present for viewer role
    expect(screen.queryByTestId('button-create-job')).toBeNull();
  });
});