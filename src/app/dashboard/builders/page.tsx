import React from 'react';
import { BuilderList } from '@/components/dashboard/builder-list';

export default function BuildersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Builder Management</h2>
            </div>
            <BuilderList />
        </div>
    );
}
