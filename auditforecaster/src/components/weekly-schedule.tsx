'use client'

import { useState, useTransition, useCallback, useMemo } from "react"
import { format, addDays, isToday, parseISO, addWeeks } from "date-fns"
import { ChevronLeft, ChevronRight, MapPin, User, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScheduleJob } from "@/app/actions/schedule"
import { getWeekJobs, assignJob, updateJobStatus, startInspection } from "@/app/actions/schedule"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ClipboardCheck } from "lucide-react"

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
    ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    COMPLETED: 'bg-green-50 text-green-700 border-green-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    RESCHEDULED: 'bg-orange-50 text-orange-700 border-orange-200',
    POSTPONED: 'bg-purple-50 text-purple-700 border-purple-200',
    REMOVED: 'bg-gray-50 text-gray-400 border-gray-200 line-through',
}

const INSPECTOR_COLORS: Record<string, string> = {
    'Shaun': 'border-l-blue-500',
    'Erik': 'border-l-emerald-500',
    'Unassigned': 'border-l-gray-300',
}

type Inspector = {
    id: string
    name: string | null
    role: string
}

type Props = {
    initialJobs: ScheduleJob[]
    inspectors: Inspector[]
    serverWeekStart: string // 'yyyy-MM-dd' from server to avoid hydration mismatch
}

export function WeeklySchedule({ initialJobs, inspectors, serverWeekStart }: Props) {
    const router = useRouter()
    const [jobs, setJobs] = useState(initialJobs)
    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedJob, setSelectedJob] = useState<ScheduleJob | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isNavigating, setIsNavigating] = useState(false)

    // Use server-provided date as base to avoid hydration mismatch from new Date()
    const baseWeekStart = useMemo(() => parseISO(serverWeekStart), [serverWeekStart])
    const weekStart = useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset])

    const jobsByDay: ScheduleJob[][] = DAYS.map((_, i) => {
        const dayDate = format(addDays(weekStart, i), 'yyyy-MM-dd')
        return jobs.filter(j => j.scheduledDate === dayDate)
    })

    const fetchWeekJobs = useCallback(async (newOffset: number) => {
        setIsNavigating(true)
        try {
            const result = await getWeekJobs(newOffset)
            if (result.success) {
                setJobs(result.jobs)
                setSelectedJob(null)
            } else {
                toast.error(result.message ?? 'Failed to load jobs')
            }
        } catch {
            toast.error('Failed to load jobs')
        } finally {
            setIsNavigating(false)
        }
    }, [])

    const navigateWeek = (direction: number) => {
        const newOffset = weekOffset + direction
        setWeekOffset(newOffset)
        fetchWeekJobs(newOffset)
    }

    const goToToday = () => {
        setWeekOffset(0)
        fetchWeekJobs(0)
    }

    // Filter out Pat (Building Knowledge) from the assign buttons - he's rarely assigned
    const assignableInspectors = inspectors.filter(i =>
        !i.name?.includes('Building Knowledge') && !i.name?.includes('Pat')
    )

    const handleAssign = (job: ScheduleJob, inspectorId: string | null, inspectorName: string | null) => {
        startTransition(async () => {
            const result = await assignJob(job.id, inspectorId)
            if (result.success) {
                const updatedJob = {
                    ...job,
                    inspectorId,
                    inspectorName: result.inspectorName ?? inspectorName,
                    status: inspectorId ? 'ASSIGNED' : 'PENDING',
                }
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? updatedJob : j
                ))
                // Keep selectedJob in sync
                setSelectedJob(updatedJob)
                toast.success(inspectorName ? `Assigned to ${inspectorName}` : 'Unassigned')
            } else {
                toast.error(result.message ?? 'Failed to assign job')
            }
        })
    }

    const handleStatusUpdate = (job: ScheduleJob, newStatus: string) => {
        startTransition(async () => {
            const result = await updateJobStatus(job.id, newStatus)
            if (result.success) {
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? { ...j, status: newStatus } : j
                ))
                toast.success(`Status updated to ${newStatus.toLowerCase()}`)
                setSelectedJob(null)
            } else {
                toast.error(result.message ?? 'Failed to update status')
            }
        })
    }

    const handleStartInspection = (job: ScheduleJob, type: 'PRE_DRYWALL' | 'FINAL_TEST') => {
        startTransition(async () => {
            const result = await startInspection(job.id, type)
            if (result.success && result.inspectionId) {
                toast.success('Inspection created')
                router.push(`/dashboard/inspections/${result.inspectionId}`)
            } else {
                toast.error(result.message ?? 'Failed to create inspection')
            }
        })
    }

    const getInspectorColor = (name: string | null) => {
        if (!name) return INSPECTOR_COLORS['Unassigned']
        if (name.includes('Shaun') || name.includes('Admin')) return INSPECTOR_COLORS['Shaun']
        if (name.includes('Erik')) return INSPECTOR_COLORS['Erik']
        return INSPECTOR_COLORS['Unassigned']
    }

    return (
        <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)} disabled={isNavigating}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                </Button>
                <div className="text-center flex items-center gap-2">
                    <span className="font-semibold text-sm">
                        {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 4), 'MMM d, yyyy')}
                    </span>
                    {weekOffset === 0 ? (
                        <Badge variant="secondary" className="text-xs">This Week</Badge>
                    ) : (
                        <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={goToToday}>
                            Today
                        </Button>
                    )}
                    {isNavigating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek(1)} disabled={isNavigating}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 md:gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-l-4 border-l-blue-500 bg-blue-50" />
                    Shaun
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-l-4 border-l-emerald-500 bg-emerald-50" />
                    Erik
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-l-4 border-l-gray-300 bg-gray-50" />
                    Unassigned
                </div>
                <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    BK Source
                </div>
            </div>

            {/* Weekly Grid - stacked on mobile, 5-col on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {DAYS.map((day, i) => {
                    const dayDate = addDays(weekStart, i)
                    const today = isToday(dayDate)
                    const dayJobsList = jobsByDay[i] ?? []

                    return (
                        <div key={day} className={cn(
                            "rounded-lg border md:min-h-[200px]",
                            today ? "border-blue-300 bg-blue-50/30" : "border-gray-200 bg-white",
                            // On mobile, hide empty non-today days to reduce scroll
                            dayJobsList.length === 0 && !today ? "hidden md:block" : ""
                        )}>
                            {/* Day Header */}
                            <div className={cn(
                                "px-3 py-2 border-b text-sm font-medium",
                                today ? "bg-blue-100/50 text-blue-800" : "bg-gray-50 text-gray-600"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span>
                                        <span className="md:hidden">{DAYS[i]}</span>
                                        <span className="hidden md:inline">{SHORT_DAYS[i]}</span>
                                    </span>
                                    <span className={cn(
                                        "text-xs",
                                        today ? "bg-blue-600 text-white rounded-full px-1.5 py-0.5" : ""
                                    )}>
                                        {format(dayDate, today ? 'MMM d' : 'd')}
                                    </span>
                                </div>
                                {dayJobsList.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {dayJobsList.length} job{dayJobsList.length !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>

                            {/* Jobs */}
                            <div className="p-1.5 space-y-1.5">
                                {dayJobsList.length === 0 && (
                                    <div className="text-xs text-muted-foreground text-center py-4">
                                        No jobs
                                    </div>
                                )}
                                {dayJobsList.map(job => (
                                    <button
                                        key={job.id}
                                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                                        className={cn(
                                            "w-full text-left rounded-md border-l-4 p-2 md:p-2 p-3 text-xs md:text-xs text-sm transition-all hover:shadow-sm cursor-pointer",
                                            getInspectorColor(job.inspectorName),
                                            selectedJob?.id === job.id ? "ring-2 ring-blue-400 shadow-sm" : "",
                                            STATUS_COLORS[job.status] || STATUS_COLORS['PENDING']
                                        )}
                                    >
                                        <div className="font-medium truncate">
                                            {job.lotNumber ? `Lot ${job.lotNumber} - ` : ''}{job.streetAddress}
                                        </div>
                                        <div className="text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                            <MapPin className="h-3 w-3 flex-shrink-0" />
                                            {job.city}
                                        </div>
                                        {job.inspectorName && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <User className="h-3 w-3 flex-shrink-0" />
                                                {job.inspectorName}
                                            </div>
                                        )}
                                        {job.source === 'Building Knowledge' && (
                                            <div className="flex items-center gap-1 mt-1 text-orange-600">
                                                <AlertCircle className="h-3 w-3" />
                                                <span className="text-xs">BK</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Job Detail Panel */}
            {selectedJob && (
                <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold">
                                {selectedJob.lotNumber ? `Lot ${selectedJob.lotNumber} - ` : ''}{selectedJob.streetAddress}
                            </h3>
                            <p className="text-sm text-muted-foreground">{selectedJob.city}</p>
                            {selectedJob.builderName && (
                                <p className="text-sm text-muted-foreground">Builder: {selectedJob.builderName}</p>
                            )}
                            {selectedJob.source === 'Building Knowledge' && (
                                <p className="text-xs text-orange-600 mt-1">
                                    Source: Building Knowledge calendar
                                </p>
                            )}
                        </div>
                        <Badge className={STATUS_COLORS[selectedJob.status]}>
                            {selectedJob.status.replace('_', ' ')}
                        </Badge>
                    </div>

                    <div className="flex gap-2 mt-4 flex-wrap">
                        <span className="text-sm text-muted-foreground self-center mr-2">Assign:</span>
                        {assignableInspectors.map(inspector => (
                            <Button
                                key={inspector.id}
                                size="sm"
                                variant={selectedJob.inspectorId === inspector.id ? "default" : "outline"}
                                onClick={() => handleAssign(selectedJob, inspector.id, inspector.name)}
                                disabled={isPending}
                            >
                                {inspector.name}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAssign(selectedJob, null, null)}
                            disabled={isPending || !selectedJob.inspectorId}
                        >
                            Unassign
                        </Button>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                        <span className="text-sm text-muted-foreground self-center mr-2">Status:</span>
                        {['COMPLETED', 'RESCHEDULED', 'FAILED', 'POSTPONED', 'REMOVED'].map(status => (
                            <Button
                                key={status}
                                size="sm"
                                variant={selectedJob.status === status ? "default" : "outline"}
                                className="text-xs"
                                onClick={() => handleStatusUpdate(selectedJob, status)}
                                disabled={isPending}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </Button>
                        ))}
                    </div>

                    {/* Inspection Actions - show when job is completed or assigned */}
                    {(selectedJob.status === 'COMPLETED' || selectedJob.status === 'ASSIGNED') && (
                        <div className="flex gap-2 mt-4 pt-3 border-t flex-wrap">
                            <span className="text-sm text-muted-foreground self-center mr-2">
                                <ClipboardCheck className="h-4 w-4 inline mr-1" />
                                Inspect:
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleStartInspection(selectedJob, 'PRE_DRYWALL')}
                                disabled={isPending}
                            >
                                Pre-Drywall
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => handleStartInspection(selectedJob, 'FINAL_TEST')}
                                disabled={isPending}
                            >
                                Final Test
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
