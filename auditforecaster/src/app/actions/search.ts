'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface SearchFilters {
  query?: string        // Search across address, lotNumber, builder name
  status?: string[]     // Filter by job statuses
  builderId?: string    // Filter by builder
  inspectorId?: string  // Filter by inspector
  dateFrom?: string     // ISO date string
  dateTo?: string       // ISO date string
  page?: number         // For pagination, default 1
  pageSize?: number     // Default 25, max 100
  sortBy?: string       // 'date' | 'address' | 'status' | 'builder'
  sortOrder?: 'asc' | 'desc'
}

interface SearchResult {
  jobs: Array<{
    id: string
    lotNumber: string
    address: string
    city: string
    status: string
    scheduledDate: Date | null
    builder: { name: string } | null
    inspector: { name: string } | null
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function searchJobs(filters: SearchFilters): Promise<SearchResult> {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Pagination defaults and bounds
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  // Build the where clause dynamically
  const where: Record<string, unknown> = {}

  // Text search: OR across address, lotNumber, and builder.name
  // SQLite's LIKE (used by Prisma `contains`) is case-insensitive for ASCII by default,
  // so we do not use `mode: 'insensitive'` which is not supported on SQLite.
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim()
    where.OR = [
      { address: { contains: q } },
      { streetAddress: { contains: q } },
      { lotNumber: { contains: q } },
      { city: { contains: q } },
      { builder: { name: { contains: q } } },
    ]
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status }
  }

  // Builder filter
  if (filters.builderId) {
    where.builderId = filters.builderId
  }

  // Inspector filter
  if (filters.inspectorId) {
    where.inspectorId = filters.inspectorId
  }

  // Date range filter on scheduledDate
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (filters.dateFrom) {
      dateFilter.gte = new Date(filters.dateFrom)
    }
    if (filters.dateTo) {
      dateFilter.lte = new Date(filters.dateTo)
    }
    where.scheduledDate = dateFilter
  }

  // Build sort order
  type OrderByClause = Record<string, unknown>
  let orderBy: OrderByClause = { createdAt: 'desc' }
  const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc'

  switch (filters.sortBy) {
    case 'date':
      orderBy = { scheduledDate: sortOrder }
      break
    case 'address':
      orderBy = { address: sortOrder }
      break
    case 'status':
      orderBy = { status: sortOrder }
      break
    case 'builder':
      orderBy = { builder: { name: sortOrder } }
      break
    default:
      orderBy = { createdAt: 'desc' }
  }

  // Execute query and count in parallel
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        builder: {
          select: { name: true },
        },
        inspector: {
          select: { name: true },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      lotNumber: job.lotNumber,
      address: job.address,
      city: job.city,
      status: job.status,
      scheduledDate: job.scheduledDate,
      builder: job.builder ? { name: job.builder.name } : null,
      inspector: job.inspector ? { name: job.inspector.name ?? '' } : null,
    })),
    total,
    page,
    pageSize,
    totalPages,
  }
}
