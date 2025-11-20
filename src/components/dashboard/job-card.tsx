'use client'

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Job {
    id: string;
    address: string;
    status: string;
}

export function JobCard({ job }: { job: Job }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: job.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2">
            <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-sm font-medium">{job.address}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p className="text-xs text-muted-foreground">Status: {job.status}</p>
                </CardContent>
            </Card>
        </div>
    );
}
