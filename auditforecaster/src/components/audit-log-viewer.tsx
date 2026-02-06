'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAuditLogs } from '@/app/actions/audit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
    id: string
    entityType: string
    entityId: string
    action: string
    actorId: string
    changes: string | null
    ipAddress: string | null
    createdAt: Date
}

interface AuditLogViewerProps {
    /** Pre-filter to a specific entity type (optional) */
    initialEntityType?: string
    /** Pre-filter to a specific entity ID (optional) */
    initialEntityId?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
    'Job',
    'Invoice',
    'User',
    'Inspection',
    'Builder',
    'Equipment',
    'Expense',
    'Payout',
    'Vehicle',
    'Subdivision',
    'PriceList',
    'Route',
    'MileageLog',
    'TaxCredit',
] as const

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const

const PAGE_SIZE = 25

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

function actionBadgeColor(action: string): string {
    switch (action) {
        case 'CREATE':
            return 'bg-green-100 text-green-800'
        case 'UPDATE':
            return 'bg-blue-100 text-blue-800'
        case 'DELETE':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

/** Parse the JSON `changes` column into a usable object, or null. */
function parseChanges(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

/** Render a single value as a readable string. */
function renderValue(val: unknown): string {
    if (val === null || val === undefined) return '(empty)'
    if (typeof val === 'object') return JSON.stringify(val, null, 2)
    return String(val)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChangesDetail({ changes }: { changes: Record<string, unknown> }) {
    const before = changes.before as Record<string, unknown> | undefined
    const after = changes.after as Record<string, unknown> | undefined
    const actorEmail = changes._actorEmail as string | undefined

    // If structured before/after exists, render a field-by-field diff
    if (before && after) {
        const allKeys = Array.from(
            new Set([...Object.keys(before), ...Object.keys(after)])
        ).filter((k) => k !== '_actorEmail')

        return (
            <div className="space-y-2">
                {actorEmail && (
                    <p className="text-xs text-gray-500">
                        Actor email: {actorEmail}
                    </p>
                )}
                <table className="w-full text-xs border border-gray-200 rounded">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-left px-3 py-1.5 font-medium text-gray-600">Field</th>
                            <th className="text-left px-3 py-1.5 font-medium text-gray-600">Before</th>
                            <th className="text-left px-3 py-1.5 font-medium text-gray-600">After</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allKeys.map((key) => (
                            <tr key={key} className="border-t border-gray-100">
                                <td className="px-3 py-1.5 font-mono text-gray-700">{key}</td>
                                <td className="px-3 py-1.5 text-red-700 bg-red-50 font-mono break-all whitespace-pre-wrap">
                                    {renderValue(before[key])}
                                </td>
                                <td className="px-3 py-1.5 text-green-700 bg-green-50 font-mono break-all whitespace-pre-wrap">
                                    {renderValue(after[key])}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    // Fallback: render raw JSON
    const displayData = { ...changes }
    delete displayData._actorEmail

    return (
        <div className="space-y-2">
            {actorEmail && (
                <p className="text-xs text-gray-500">
                    Actor email: {actorEmail}
                </p>
            )}
            <pre className="text-xs bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(displayData, null, 2)}
            </pre>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AuditLogViewer({
    initialEntityType,
    initialEntityId,
}: AuditLogViewerProps = {}) {
    // Filters
    const [entityType, setEntityType] = useState(initialEntityType || '')
    const [action, setAction] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Data
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Expanded rows
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const fetchLogs = useCallback(async (targetPage: number) => {
        setLoading(true)
        setError(null)
        try {
            const result = await getAuditLogs({
                entityType: entityType || undefined,
                entityId: initialEntityId || undefined,
                action: action || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                page: targetPage,
                pageSize: PAGE_SIZE,
            })
            setLogs(result.logs)
            setTotal(result.total)
            setPage(result.page)
            setTotalPages(result.totalPages)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load audit logs')
        } finally {
            setLoading(false)
        }
    }, [entityType, action, dateFrom, dateTo, initialEntityId])

    // Fetch on mount and when filters change
    useEffect(() => {
        fetchLogs(1)
    }, [fetchLogs])

    const toggleExpanded = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const handleApplyFilters = () => {
        setPage(1)
        fetchLogs(1)
    }

    const handleClearFilters = () => {
        setEntityType(initialEntityType || '')
        setAction('')
        setDateFrom('')
        setDateTo('')
        setPage(1)
        // fetchLogs will be triggered by the useEffect since deps changed
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Entity Type */}
                    <div>
                        <label htmlFor="audit-entity-type" className="block text-xs font-medium text-gray-600 mb-1">
                            Entity Type
                        </label>
                        <select
                            id="audit-entity-type"
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {ENTITY_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action */}
                    <div>
                        <label htmlFor="audit-action" className="block text-xs font-medium text-gray-600 mb-1">
                            Action
                        </label>
                        <select
                            id="audit-action"
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">All Actions</option>
                            {ACTIONS.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label htmlFor="audit-date-from" className="block text-xs font-medium text-gray-600 mb-1">
                            From Date
                        </label>
                        <input
                            id="audit-date-from"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label htmlFor="audit-date-to" className="block text-xs font-medium text-gray-600 mb-1">
                            To Date
                        </label>
                        <input
                            id="audit-date-to"
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <button
                        onClick={handleApplyFilters}
                        disabled={loading}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={handleClearFilters}
                        disabled={loading}
                        className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                        Clear
                    </button>
                    {loading && (
                        <span className="text-xs text-gray-500">Loading...</span>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                    {total} {total === 1 ? 'entry' : 'entries'} found
                </span>
                <span>
                    Page {page} of {totalPages}
                </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Entity Type</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Entity ID</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                            </tr>
                        </thead>
                        {logs.length === 0 && !loading ? (
                            <tbody>
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center py-12 text-gray-500"
                                    >
                                        No audit log entries found.
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            logs.map((log) => {
                                const isExpanded = expandedIds.has(log.id)
                                const changes = parseChanges(log.changes)

                                return (
                                    <tbody key={log.id}>
                                        <tr
                                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => toggleExpanded(log.id)}
                                        >
                                            <td className="px-4 py-3 text-gray-400">
                                                <span
                                                    className={`inline-block transition-transform ${
                                                        isExpanded ? 'rotate-90' : ''
                                                    }`}
                                                >
                                                    &#9654;
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                                {formatDate(log.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                                                {changes?._actorEmail
                                                    ? String(changes._actorEmail)
                                                    : log.actorId}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${actionBadgeColor(
                                                        log.action
                                                    )}`}
                                                >
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {log.entityType}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[160px] truncate">
                                                {log.entityId}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {log.ipAddress || '-'}
                                            </td>
                                        </tr>

                                        {/* Expanded detail row */}
                                        {isExpanded && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <div className="ml-6">
                                                        <h4 className="text-xs font-semibold text-gray-600 mb-2">
                                                            Change Details
                                                        </h4>
                                                        {changes ? (
                                                            <ChangesDetail changes={changes} />
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">
                                                                No change details recorded.
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                )
                            })
                        )}
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => fetchLogs(1)}
                        disabled={page <= 1 || loading}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        First
                    </button>
                    <button
                        onClick={() => fetchLogs(page - 1)}
                        disabled={page <= 1 || loading}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>

                    {/* Page number indicators */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        // Show pages centered around current page
                        let pageNum: number
                        if (totalPages <= 5) {
                            pageNum = i + 1
                        } else if (page <= 3) {
                            pageNum = i + 1
                        } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                        } else {
                            pageNum = page - 2 + i
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => fetchLogs(pageNum)}
                                disabled={loading}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                    pageNum === page
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                } disabled:opacity-40`}
                            >
                                {pageNum}
                            </button>
                        )
                    })}

                    <button
                        onClick={() => fetchLogs(page + 1)}
                        disabled={page >= totalPages || loading}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                    </button>
                    <button
                        onClick={() => fetchLogs(totalPages)}
                        disabled={page >= totalPages || loading}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Last
                    </button>
                </div>
            )}
        </div>
    )
}
