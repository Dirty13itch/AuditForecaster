import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Navigation } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function RouteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const route = await prisma.route.findUnique({
        where: { id },
        include: {
            driver: true,
            stops: {
                include: {
                    job: true
                },
                orderBy: {
                    order: 'asc'
                }
            }
        }
    })

    if (!route) {
        notFound()
    }

    // Generate Google Maps URL for the entire route
    const waypoints = route.stops.map(stop => encodeURIComponent(stop.job?.address || "")).join("|")
    const destination = route.stops[route.stops.length - 1]?.job?.address || ""
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${encodeURIComponent(destination)}&waypoints=${waypoints}&travelmode=driving`

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/logistics/routes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Route Details</h2>
                        <p className="text-muted-foreground">
                            {new Date(route.date).toLocaleDateString()} • {route.driver.name}
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                        <Navigation className="mr-2 h-4 w-4" /> Start Navigation
                    </a>
                </Button>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Stops ({route.stops.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0">
                        {route.stops.map((stop, index) => (
                            <div key={stop.id} className="flex gap-4 py-4 border-b last:border-0 items-start">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    {index < route.stops.length - 1 && (
                                        <div className="w-0.5 h-12 bg-border my-1" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold">{stop.job?.address}</h4>
                                        <Badge variant={stop.status === 'COMPLETED' ? 'default' : 'outline'}>
                                            {stop.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">Lot {stop.job?.lotNumber}</p>
                                    {stop.job?.scheduledDate && (
                                        <p className="text-xs text-muted-foreground">
                                            Scheduled: {new Date(stop.job.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
