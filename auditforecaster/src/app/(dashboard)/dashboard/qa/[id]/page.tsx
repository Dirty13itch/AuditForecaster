import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, CheckCircle } from "lucide-react"
import Image from "next/image"
import { approveJob } from "@/app/actions/qa"
import { RejectJobDialog } from "@/components/reject-job-dialog"

export default async function QAReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                include: {
                    photos: true
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
        },
    })

    const inspection = job?.inspections[0]

    if (!job || !inspection) {
        notFound()
    }

    const inspectionData = inspection.data ? JSON.parse(inspection.data) : {}

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/dashboard/qa">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">QA Review</h1>
                    <p className="text-gray-500">{job.streetAddress}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Inspection Data */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Blower Door Results</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-500">CFM @ 50Pa</div>
                                <div className="text-3xl font-bold">{inspectionData.cfm50}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Notes</div>
                                <div className="text-gray-700">{inspectionData.notes || 'No notes provided.'}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Photos */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Photos ({inspection.photos.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {inspection.photos.map(photo => (
                                    <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                        <Image
                                            src={photo.url}
                                            alt="Inspection"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    </div>
                                ))}
                                {inspection.photos.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-400 italic">
                                        No photos uploaded.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions Panel */}
                <div className="space-y-6">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800">Review Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form action={approveJob}>
                                <input type="hidden" name="jobId" value={job.id} />
                                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve & Invoice
                                </Button>
                            </form>

                            <RejectJobDialog jobId={job.id} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Job Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Builder</span>
                                <span className="font-medium">{job.builder?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Inspector</span>
                                <span className="font-medium">{job.inspector?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Date</span>
                                <span className="font-medium">{format(new Date(inspection.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
