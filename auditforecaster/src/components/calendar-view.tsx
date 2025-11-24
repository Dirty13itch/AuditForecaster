'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Job } from '@prisma/client'
import Link from 'next/link'

interface CalendarViewProps {
    jobs: Job[]
}

export function CalendarView({ jobs }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const today = () => setCurrentDate(new Date())

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Group jobs by date
    const jobsByDate = jobs.reduce((acc, job) => {
        if (!job.scheduledDate) return acc
        const dateKey = format(job.scheduledDate, 'yyyy-MM-dd')
        if (!acc[dateKey]) {
            acc[dateKey] = []
        }
        acc[dateKey].push(job)
        return acc
    }, {} as Record<string, Job[]>)

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg font-semibold">
                        {format(currentDate, 'MMMM yyyy')}
                    </CardTitle>
                </div>
                <div className="flex items-center space-x-1">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={today}>Today</Button>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <div className="grid grid-cols-7 border-b text-center text-sm font-medium text-gray-500 bg-gray-50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-2 border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr h-[600px]">
                    {/* Padding for days before start of month could be added here if we wanted a full 6-week grid, 
                        but for simplicity we'll just show the days of the month or use a library like react-day-picker for full calendar logic.
                        Actually, let's do a simple offset.
                    */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-b border-r bg-gray-50/30" />
                    ))}

                    {days.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd')
                        const dayJobs = jobsByDate[dateKey] || []
                        const isToday = isSameDay(day, new Date())

                        return (
                            <div
                                key={day.toString()}
                                className={`min-h-[100px] border-b border-r p-2 transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/50' : ''}`}
                            >
                                <div className={`text-right text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
                                    {format(day, 'd')}
                                </div>
                                <div className="space-y-1">
                                    {dayJobs.map(job => (
                                        <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                                            <div className="text-xs p-1 rounded bg-white border shadow-sm hover:border-blue-400 truncate cursor-pointer">
                                                <div className="font-medium truncate">{job.lotNumber}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{job.status}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* Fill remaining cells */}
                    {Array.from({ length: 42 - (monthStart.getDay() + days.length) }).map((_, i) => (
                        <div key={`empty-end-${i}`} className="border-b border-r bg-gray-50/30" />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
