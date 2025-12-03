'use client'

import { motion } from "framer-motion"
import { Job, Builder, User } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, User as UserIcon, Home } from "lucide-react"
import Link from "next/link"

interface JobCardProps {
    job: Job & {
        builder: Builder | null;
        inspector: Pick<User, 'id' | 'name' | 'email' | 'image' | 'role'> | null
    }
}

export function JobCard({ job }: JobCardProps) {
    return (
        <Link href={`/dashboard/jobs/${job.id}`}>
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
                <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className={
                        job.status === 'COMPLETED' ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                            job.status === 'IN_PROGRESS' ? "border-blue-200 bg-blue-50 text-blue-700" :
                                "border-gray-200 bg-gray-50 text-gray-700"
                    }>
                        {job.status}
                    </Badge>
                    {job.scheduledDate && (
                        <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(job.scheduledDate).toLocaleDateString()}
                        </div>
                    )}
                </div>

                <h3 className="font-semibold text-gray-900 truncate">{job.streetAddress}</h3>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {job.city}
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Home className="h-3 w-3 text-orange-500" />
                        <span className="truncate">{job.builder?.name || 'Unknown Builder'}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-gray-500">Lot {job.lotNumber}</span>
                    </div>

                    {job.inspector && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <UserIcon className="h-3 w-3 text-blue-500" />
                            <span>{job.inspector.name}</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    )
}
