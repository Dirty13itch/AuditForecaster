'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Map, Navigation } from 'lucide-react'
import { getTodaysRoute } from '@/app/actions/logistics'

export function RouteOptimizer() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getTodaysRoute().then(data => {
            setJobs(data)
            setLoading(false)
        })
    }, [])

    const handleLaunchNavigation = () => {
        if (jobs.length === 0) return

        // Origin is current location (handled by Google Maps)
        // Destination is the LAST job
        // Waypoints are the intermediate jobs

        const destination = encodeURIComponent(`${jobs[jobs.length - 1].streetAddress}, ${jobs[jobs.length - 1].city}`)

        let waypoints = ''
        if (jobs.length > 1) {
            const waypointAddresses = jobs.slice(0, -1).map(j => `${j.streetAddress}, ${j.city}`)
            waypoints = `&waypoints=${encodeURIComponent(waypointAddresses.join('|'))}`
        }

        const url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${destination}${waypoints}`
        window.open(url, '_blank')
    }

    if (loading) return <div>Loading route...</div>

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" /> Today&apos;s Route
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    {jobs.length === 0 ? (
                        <p className="text-muted-foreground">No jobs scheduled for today.</p>
                    ) : (
                        jobs.map((job, index) => (
                            <div key={job.id} className="flex items-center gap-4 p-3 border rounded-lg bg-slate-50">
                                <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="font-medium">{job.streetAddress}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {job.subdivision?.name} • Lot {job.lotNumber}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleLaunchNavigation}
                    disabled={jobs.length === 0}
                >
                    <Navigation className="mr-2 h-4 w-4" /> Start Navigation
                </Button>
            </CardContent>
        </Card>
    )
}
