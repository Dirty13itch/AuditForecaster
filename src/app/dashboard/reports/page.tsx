'use client'

import React from 'react';
import { ReportBuilder } from '@/components/reports/report-builder';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Report Templates</h2>
                <Button>
                    <Save className="mr-2 h-4 w-4" /> Save Template
                </Button>
            </div>

            <ReportBuilder />
        </div>
    );
}
