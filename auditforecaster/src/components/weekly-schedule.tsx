'use client'

import { useState, useTransition } from "react"
import { format, startOfWeek, addDays, isToday, parseISO } from "date-fns"
import { ChevronLeft, ChevronRight, MapPin, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ScheduleJob } from "@/app/actions/schedule"
import { assignJob, updateJobStatus } from "@/app/actions/schedule"
import { toast } from "sonner"

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

type Props = {
    initialJobs: ScheduleJob[]
}

export function WeeklySchedule({ initialJobs }: Props) {
    const [jobs, setJobs] = useState(initialJobs)
    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedJob, setSelectedJob] = useState<ScheduleJob | null>(null)
    const [isPending, startTransition] = useTransition()

    const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })

    const jobsByDay: ScheduleJob[][] = DAYS.map((_, i) => {
        const dayDate = format(addDays(weekStart, i), 'yyyy-MM-dd')
        return jobs.filter(j => j.scheduledDate === dayDate)
    })

    const navigateWeek = (direction: number) => {
        setWeekOffset(prev => prev + direction)
        // TODO: fetch new week's jobs from server
    }

    const handleAssign = (job: ScheduleJob, inspectorName: string | null) => {
        startTransition(async () => {
            // For now, map name to a placeholder ID - will be replaced with real user lookup
            const result = await assignJob(job.id, inspectorName === 'Shaun' ? 'shaun-id' : inspectorName === 'Erik' ? 'erik-id' : null)
            if (result.success) {
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? { ...j, inspectorName: inspectorName, status: inspectorName ? 'ASSIGNED' : 'PENDING' } : j
                ))
                toast.success(inspectorName ? `Assigned to ${inspectorName}` : 'Unassigned')
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
                <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                </Button>
                <div className="text-center">
                    <span className="font-semibold text-sm">
                        {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 4), 'MMM d, yyyy')}
                    </span>
                    {weekOffset === 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">This Week</Badge>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs text-muted-foreground">
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
                    Updated by BK
                </div>
            </div>

            {/* Weekly Grid */}
            <div className="grid grid-cols-5 gap-2">
                {DAYS.map((day, i) => {
                    const dayDate = addDays(weekStart, i)
                    const dayJobs = jobsByDay[i]
                    const today = isToday(dayDate)

                    const dayJobsList = jobsByDay[i] ?? []

                    return (
                        <div key={day} className={cn(
                            "rounded-lg border min-h-[200px]",
                            today ? "border-blue-300 bg-blue-50/30" : "border-gray-200 bg-white"
                        )}>
                            {/* Day Header */}
                            <div className={cn(
                                "px-3 py-2 border-b text-sm font-medium",
                                today ? "bg-blue-100/50 text-blue-800" : "bg-gray-50 text-gray-600"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span>{SHORT_DAYS[i]}</span>
                                    <span className={cn(
                                        "text-xs",
                                        today ? "bg-blue-600 text-white rounded-full px-1.5 py-0.5" : ""
                                    )}>
                                        {format(dayDate, 'd')}
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
                                            "w-full text-left rounded-md border-l-4 p-2 text-xs transition-all hover:shadow-sm cursor-pointer",
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
                                                <span className="text-[10px]">BK</span>
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

                    <div className="flex gap-2 mt-4">
                        <span className="text-sm text-muted-foreground self-center mr-2">Assign:</span>
                        <Button
                            size="sm"
                            variant={selectedJob.inspectorName?.includes('Shaun') || selectedJob.inspectorName?.includes('Admin') ? "default" : "outline"}
                            onClick={() => handleAssign(selectedJob, 'Shaun')}
                            disabled={isPending}
                        >
                            Shaun
                        </Button>
                        <Button
                            size="sm"
                            variant={selectedJob.inspectorName?.includes('Erik') ? "default" : "outline"}
                            onClick={() => handleAssign(selectedJob, 'Erik')}
                            disabled={isPending}
                        >
                            Erik
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAssign(selectedJob, null)}
                            disabled={isPending}
                        >
                            Unassign
                        </Button>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <span className="text-sm text-muted-foreground self-center mr-2">Status:</span>
                        {['COMPLETED', 'RESCHEDULED', 'FAILED', 'POSTPONED', 'REMOVED'].map(status => (
                            <Button
                                key={status}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => handleStatusUpdate(selectedJob, status)}
                                disabled={isPending}
                            >
                                {status.charAt(0) + status.slice(1).toLowerCase()}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
