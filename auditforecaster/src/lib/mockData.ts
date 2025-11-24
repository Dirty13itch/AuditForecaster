// Mock data for demo purposes (bypasses Prisma __internal error)

export const mockBuilders = [
  {
    id: '1',
    name: 'Acme Construction',
    email: 'contact@acme.com',
    phone: '(555) 123-4567',
    address: '123 Main St, Minneapolis, MN',
    contactInfo: 'John Smith',
    paymentTerms: 'Net 30',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    _count: { jobs: 5 }
  },
  {
    id: '2',
    name: 'Summit Homes LLC',
    email: 'info@summithomes.com',
    phone: '(555) 234-5678',
    address: null,
    contactInfo: 'Sarah Johnson',
    paymentTerms: 'Net 15',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    _count: { jobs: 3 }
  },
  {
    id: '3',
    name: 'Green Valley Builders',
    email: 'contact@greenvalley.com',
    phone: '(555) 345-6789',
    address: '456 Oak Ave, St. Paul, MN',
    contactInfo: null,
    paymentTerms: 'Net 30',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    _count: { jobs: 8 }
  },
]

export const mockJobs = [
  {
    id: '1',
    lotNumber: '101',
    streetAddress: '789 Maple Dr',
    city: 'Minneapolis',
    address: '789 Maple Dr, Minneapolis',
    status: 'PENDING' as const,
    scheduledDate: new Date('2024-12-15'),
    inspectorId: null,
    builderId: '1',
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-01'),
    builder: mockBuilders[0]
  },
  {
    id: '2',
    lotNumber: '102',
    streetAddress: '456 Pine St',
    city: 'St. Paul',
    address: '456 Pine St, St. Paul',
    status: 'IN_PROGRESS' as const,
    scheduledDate: new Date('2024-12-18'),
    inspectorId: null,
    builderId: '2',
    createdAt: new Date('2024-11-05'),
    updatedAt: new Date('2024-11-05'),
    builder: mockBuilders[1]
  },
  {
    id: '3',
    lotNumber: '205',
    streetAddress: '321 Elm Ave',
    city: 'Bloomington',
    address: '321 Elm Ave, Bloomington',
    status: 'COMPLETED' as const,
    scheduledDate: new Date('2024-11-20'),
    inspectorId: null,
    builderId: '3',
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-11-20'),
    builder: mockBuilders[2]
  },
  {
    id: '4',
    lotNumber: '87',
    streetAddress: '999 Cedar Ln',
    city: 'Edina',
    address: '999 Cedar Ln, Edina',
    status: 'PENDING' as const,
    scheduledDate: new Date('2024-12-22'),
    inspectorId: null,
    builderId: '1',
    createdAt: new Date('2024-11-10'),
    updatedAt: new Date('2024-11-10'),
    builder: mockBuilders[0]
  },
]
