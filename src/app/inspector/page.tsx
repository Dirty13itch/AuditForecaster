'use client'

import React from 'react';
import { useJobs } from '@/hooks/use-jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Building } from 'lucide-react';
import Link from 'next/link';

export default function InspectorJobsPage() {
    const { jobs, isLoading } = useJobs();

    if (isLoading) {
        return <div className="p-4 text-center">Loading jobs...</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">My Assignments</h2>

            {jobs?.map((job) => (
                <Link href={`/inspector/jobs/${job.id}`} key={job.id}>
                    <Card className="mb-4 active:scale-95 transition-transform">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base">{job.address}</CardTitle>
                                <Badge variant={job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                    {job.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-2">
                                <Building size={14} />
                                <span>{job.builderName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>{job.scheduledDate}</span>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}

            {jobs?.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                    No jobs assigned.
                </div>
            )}
        </div>
    );
}
