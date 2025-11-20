'use client'

import React, { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JobCard } from './job-card';

// Mock data
const initialJobs = [
    { id: '1', address: '123 Main St', status: 'PENDING' },
    { id: '2', address: '456 Oak Ave', status: 'ASSIGNED' },
    { id: '3', address: '789 Pine Ln', status: 'PENDING' },
];

export function JobBoard() {
    const [jobs, setJobs] = useState(initialJobs);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setJobs((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    return (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-100 p-4 rounded-lg">
                    <h3 className="font-bold mb-4">Pending</h3>
                    <SortableContext items={jobs.filter(j => j.status === 'PENDING')} strategy={verticalListSortingStrategy}>
                        {jobs.filter(j => j.status === 'PENDING').map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </SortableContext>
                </div>
                <div className="bg-slate-100 p-4 rounded-lg">
                    <h3 className="font-bold mb-4">Assigned</h3>
                    <SortableContext items={jobs.filter(j => j.status === 'ASSIGNED')} strategy={verticalListSortingStrategy}>
                        {jobs.filter(j => j.status === 'ASSIGNED').map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </SortableContext>
                </div>
            </div>
        </DndContext>
    );
}
