'use client'

import { Job, Builder, User } from "@prisma/client"
import { JobCard } from "./job-card"

interface JobBoardProps {
    jobs: (Job & {
        builder: Builder | null;
        inspector: Pick<User, 'id' | 'name' | 'email' | 'image' | 'role'> | null
    })[]
}

const COLUMNS = [
    { id: 'PENDING', title: 'Pending' },
    { id: 'ASSIGNED', title: 'Assigned' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'COMPLETED', title: 'Completed' }
]

export function JobBoard({ jobs }: JobBoardProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 overflow-x-auto pb-4">
            {COLUMNS.map(col => {
                const colJobs = jobs.filter(j => j.status === col.id)
                return (
                    <div key={col.id} className="min-w-[280px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">{col.title}</h3>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                {colJobs.length}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {colJobs.map(job => (
                                <JobCard key={job.id} job={job} />
                            ))}
                            {colJobs.length === 0 && (
                                <div className="h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                                    No jobs
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
