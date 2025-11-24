import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { notFound } from "next/navigation"
import Image from "next/image"

export default async function BuilderJobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            inspections: {
                include: {
                    photos: true
                },
                take: 1,
                orderBy: {
                    createdAt: 'desc'
                }
            },
            builder: true
        }
    })

    if (!job) {
        notFound()
    }

    const inspection = job.inspections[0]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/builder/jobs">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
                    <p className="text-muted-foreground">Lot {job.lotNumber} - {job.streetAddress}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <Badge variant={job.status === 'COMPLETED' ? 'default' : 'secondary'} className="mt-1">
                                    {job.status}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Date Created</p>
                                <p className="text-sm mt-1">{format(new Date(job.createdAt), 'MMM d, yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">City</p>
                                <p className="text-sm mt-1">{job.city}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Builder</p>
                                <p className="text-sm mt-1">{job.builder?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Inspection Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {inspection ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                                    <FileText className="h-8 w-8 text-green-600" />
                                    <div className="flex-1">
                                        <p className="font-medium">Inspection Completed</p>
                                        <p className="text-sm text-muted-foreground">
                                            Completed on {format(new Date(inspection.updatedAt), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <Button className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF Report
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center">
                                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="font-medium">No Report Available</p>
                                <p className="text-sm text-muted-foreground">Inspection has not been completed yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {inspection && inspection.photos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Site Photos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {inspection.photos.map((photo) => (
                                <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border relative">
                                    <Image
                                        src={photo.url}
                                        alt={photo.caption || "Site photo"}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
