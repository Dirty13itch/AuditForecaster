'use client'

import { useState } from 'react'
import { Job, Builder } from '@prisma/client'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, MapPin, List } from "lucide-react"
import Link from "next/link"
import { CalendarView } from "@/components/calendar-view"

interface JobsViewProps {
    jobs: (Job & { builder: Builder | null })[]
}

export function JobsView({ jobs }: JobsViewProps) {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

    return (
        <div className="space-y-4">
            <div className="flex justify-end space-x-2">
                <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                >
                    <List className="mr-2 h-4 w-4" />
                    List
                </Button>
                <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Calendar
                </Button>
            </div>

            {viewMode === 'list' ? (
                <div className="space-y-4">
                    {jobs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                            No jobs found matching your criteria.
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <Link href={`/dashboard/jobs/${job.id}`} key={job.id} className="block group">
                                <Card className="group-hover:border-blue-500 transition-colors">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="font-semibold text-lg group-hover:text-blue-600">{job.streetAddress}</h3>
                                                    <Badge variant={job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                        {job.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500 space-x-4">
                                                    <span className="flex items-center">
                                                        <MapPin className="mr-1 h-3 w-3" />
                                                        {job.city}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <CalendarIcon className="mr-1 h-3 w-3" />
                                                        {new Date(job.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Builder: <span className="font-medium">{job.builder?.name || 'Unknown'}</span> • Lot: {job.lotNumber}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            ) : (
                <CalendarView jobs={jobs} />
            )}
        </div>
    )
}
