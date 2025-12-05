import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StartInspectionButton } from "@/components/start-inspection-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, Calendar, Building2 } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JobPhotos } from "@/components/jobs/job-photos"

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: true,
        },
    })

    if (!job) {
        notFound()
    }

    // Fetch photos associated with any inspection of this job
    const photos = await prisma.photo.findMany({
        where: {
            inspection: {
                jobId: id
            }
        },
        include: {
            inspection: {
                include: {
                    job: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const activeInspectionId = job.inspections?.[0]?.id

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/dashboard/jobs">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Job Details</h1>
            </div>

            <Tabs defaultValue="details" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="photos">Photos</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Building2 className="h-5 w-5 text-gray-500" />
                                    <span>Property Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Address</div>
                                    <div className="text-lg font-semibold">{job.streetAddress}</div>
                                    <div className="text-gray-600">{job.city}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm font-medium text-gray-500">Lot Number</div>
                                        <div>{job.lotNumber}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-500">Builder</div>
                                        <div>{job.builder?.name || 'N/A'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    <span>Schedule & Status</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Status</div>
                                    <Badge className="mt-1" variant={job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                        {job.status}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Scheduled Date</div>
                                    <div className="text-lg">
                                        {job.scheduledDate ? format(new Date(job.scheduledDate), 'PPP') : 'Not scheduled'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500">Assigned Inspector</div>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                            {job.inspector?.name?.charAt(0) || '?'}
                                        </div>
                                        <span>{job.inspector?.name || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex space-x-3">
                        {job.status === 'COMPLETED' || job.status === 'INVOICED' ? (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={`/dashboard/reports/${job.id}`}>View Report</Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={`/dashboard/invoices/${job.id}`}>View Invoice</Link>
                                </Button>
                                <Button variant="secondary" disabled>Inspection Completed</Button>
                            </>
                        ) : (
                            <StartInspectionButton
                                jobId={job.id}
                                hasInspections={!!job.inspections && job.inspections.length > 0}
                                inspectionId={job.inspections?.[0]?.id}
                            />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="photos">
                    <JobPhotos 
                        jobId={job.id} 
                        inspectionId={activeInspectionId} 
                        photos={photos} 
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
