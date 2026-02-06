'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { searchJobs } from '@/app/actions/search'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Calendar, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react'

const JOB_STATUSES = [
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ON_HOLD',
  'REJECTED',
]

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

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, selectedStatuses, dateFrom, dateTo, sortBy, sortOrder])

  const performSearch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await searchJobs({
        query: debouncedQuery || undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize: 25,
      })
      setResults(result)
    } catch {
      // Silently handle errors - results stay as previous state
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, selectedStatuses, dateFrom, dateTo, sortBy, sortOrder, page])

  // Trigger search whenever filters or page change
  useEffect(() => {
    performSearch()
  }, [performSearch])

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  const clearFilters = () => {
    setQuery('')
    setSelectedStatuses([])
    setDateFrom('')
    setDateTo('')
    setSortBy('date')
    setSortOrder('desc')
    setPage(1)
  }

  const hasActiveFilters =
    selectedStatuses.length > 0 || dateFrom || dateTo

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default' as const
      case 'CANCELLED':
      case 'REJECTED':
        return 'destructive' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by address, lot number, or builder..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {selectedStatuses.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Status checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {JOB_STATUSES.map((status) => (
                <label
                  key={status}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    selectedStatuses.includes(status)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                    className="sr-only"
                  />
                  {status.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="date">Scheduled Date</option>
                <option value="address">Address</option>
                <option value="status">Status</option>
                <option value="builder">Builder</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {results && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {results.total === 0
              ? 'No jobs found'
              : `Showing ${(results.page - 1) * results.pageSize + 1}-${Math.min(
                  results.page * results.pageSize,
                  results.total
                )} of ${results.total} job${results.total !== 1 ? 's' : ''}`}
          </span>
          {loading && (
            <span className="text-blue-600">Searching...</span>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && !results && (
        <div className="text-center py-12 text-gray-500">
          Loading jobs...
        </div>
      )}

      {/* Results list */}
      {results && (
        <div className="space-y-3">
          {results.jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
              No jobs found matching your criteria.
            </div>
          ) : (
            results.jobs.map((job) => (
              <Link
                href={`/dashboard/jobs/${job.id}`}
                key={job.id}
                className="block group"
              >
                <Card className="group-hover:border-blue-500 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm group-hover:text-blue-600 truncate">
                            {job.address}
                          </h3>
                          <Badge variant={statusBadgeVariant(job.status)}>
                            {job.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 gap-4 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.city}
                          </span>
                          {job.scheduledDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(job.scheduledDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Lot: {job.lotNumber}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {job.builder && (
                            <span>
                              Builder:{' '}
                              <span className="font-medium">{job.builder.name}</span>
                            </span>
                          )}
                          {job.inspector && (
                            <span className="ml-3">
                              Inspector:{' '}
                              <span className="font-medium">{job.inspector.name}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {results && results.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600 px-2">
            Page {results.page} of {results.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(results.totalPages, p + 1))}
            disabled={page >= results.totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
