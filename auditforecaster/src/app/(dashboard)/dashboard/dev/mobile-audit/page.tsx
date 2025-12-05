'use client'

import React from 'react'
import { MileageSwipe } from '@/components/finance/mileage-swipe'
import { ProjectFeed } from '@/components/jobs/project-feed'
import { ScenarioBuilder } from '@/components/analytics/scenario-builder'
import { Button } from '@/components/ui/button'
import { ActionItemDialog } from '@/components/inspection/action-item-dialog'

export default function MobileAuditPage() {
    const [open, setOpen] = React.useState(false)

    // Mock Data
    const mockLogs = [
        { id: '1', date: new Date(), distance: 12.5, startLocation: 'Office', endLocation: 'Site A' },
        { id: '2', date: new Date(), distance: 5.2, startLocation: 'Site A', endLocation: 'Home' },
    ]

    const mockPhotos = [
        {
            id: '1',
            url: 'https://placehold.co/600x400',
            caption: 'Test Photo 1',
            createdAt: new Date(),
            latitude: 30.2672,
            longitude: -97.7431,
            inspection: {
                job: {
                    streetAddress: '123 Test St',
                    city: 'Austin'
                }
            }
        },
        {
            id: '2',
            url: 'https://placehold.co/600x400',
            caption: 'Test Photo 2',
            createdAt: new Date(Date.now() - 86400000), // Yesterday
            latitude: 30.2672,
            longitude: -97.7431,
            inspection: {
                job: {
                    streetAddress: '123 Test St',
                    city: 'Austin'
                }
            }
        }
    ]

    return (
        <div className="space-y-8 p-4 pb-20">
            <h1 className="text-2xl font-bold">Mobile Audit Playground</h1>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Mileage Swipe</h2>
                <div className="border p-4 rounded-lg">
                    <MileageSwipe logs={mockLogs} onComplete={() => alert('Done')} />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Project Feed</h2>
                <div className="border p-4 rounded-lg">
                    <ProjectFeed photos={mockPhotos} />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Scenario Builder</h2>
                <div className="border p-4 rounded-lg">
                    <ScenarioBuilder />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Action Item Dialog</h2>
                <div className="border p-4 rounded-lg">
                    <Button onClick={() => setOpen(true)}>Open Action Item Dialog</Button>
                    <ActionItemDialog 
                        open={open}
                        onOpenChange={setOpen}
                        inspectionId="test-inspection" 
                        failedItemTitle="Failed Window Seal"
                        onSuccess={() => {}}
                    />
                </div>
            </section>
        </div>
    )
}
