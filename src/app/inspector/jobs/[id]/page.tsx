'use client'

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlowerDoorForm } from '@/components/inspector/blower-door-form';
import { PhotoCapture } from '@/components/inspector/photo-capture';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InspectionReportPDF } from '@/components/reports/pdf-document';

export default function JobDetailsPage({ params }: { params: { id: string } }) {
    // Mock data for report
    const reportData = {
        address: '123 Main St',
        builder: 'M/I Homes',
        date: '2023-10-27',
        ach50: 2.85,
        volume: 25000,
        cfm50: 1187.5
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Link href="/inspector" className="flex items-center text-slate-600">
                    <ArrowLeft size={20} className="mr-1" /> Back
                </Link>
                <div className="flex gap-2">
                    <PDFDownloadLink document={<InspectionReportPDF data={reportData} />} fileName="report.pdf">
                        {({ blob, url, loading, error }) => (
                            <Button size="sm" variant="outline" disabled={loading}>
                                {loading ? 'Generating...' : 'Download Report'}
                            </Button>
                        )}
                    </PDFDownloadLink>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <Save size={16} className="mr-1" /> Save
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold">123 Main St</h2>
                <p className="text-slate-500 text-sm">M/I Homes • Scheduled: Oct 27</p>
            </div>

            <Tabs defaultValue="blowerdoor">
                <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="blowerdoor">Blower Door</TabsTrigger>
                    <TabsTrigger value="duct">Duct Test</TabsTrigger>
                    <TabsTrigger value="photos">Photos</TabsTrigger>
                </TabsList>

                <TabsContent value="blowerdoor">
                    <BlowerDoorForm />
                </TabsContent>

                <TabsContent value="duct">
                    <div className="p-8 text-center text-slate-500 bg-white rounded-lg">
                        Duct Leakage Form Placeholder
                    </div>
                </TabsContent>

                <TabsContent value="photos">
                    <PhotoCapture />
                </TabsContent>
            </Tabs>
        </div>
    );
}
