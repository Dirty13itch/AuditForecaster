import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2 } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "QA Dashboard | AuditForecaster",
    description: "Quality assurance review for completed jobs.",
}

export default async function QADashboardPage() {
    const jobsToReview = await prisma.job.findMany({
        where: {
            status: 'COMPLETED', // Jobs ready for QA
        },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                orderBy: { createdAt: 'desc' },
                take: 1
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">QA Dashboard</h1>
                    <p className="text-gray-500">Review completed inspections</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">
                    {jobsToReview.length} Pending Reviews
                </div>
            </div>

            <div className="grid gap-4">
                {jobsToReview.map((job) => {
                    const inspection = job.inspections[0]
                    const inspectionData = inspection?.data ? JSON.parse(inspection.data) : null
                    return (
                        <Link href={`/dashboard/qa/${job.id}`} key={job.id}>
                            <Card className="hover:bg-gray-50 transition-colors cursor-pointer border-l-4 border-l-blue-500">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-semibold text-lg">{job.streetAddress}</span>
                                                <Badge variant="secondary">Ready for QA</Badge>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Lot {job.lotNumber} • {job.city} • {job.builder?.name}
                                            </div>
                                            {/* Quick stats if available */}
                                            {inspectionData && inspectionData.cfm50 && (
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {inspectionData.cfm50} <span className="text-sm font-normal text-gray-500">CFM</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}

                {jobsToReview.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium">All caught up!</h3>
                        <p>No jobs currently waiting for QA review.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
