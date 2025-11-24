import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileBarChart, Printer } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default async function ReportsPage() {
    const jobs = await prisma.job.findMany({
        where: {
            status: { in: ['COMPLETED', 'INVOICED'] }
        },
        include: {
            inspections: {
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            builder: true,
            inspector: true
        },
        orderBy: { updatedAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">All Reports</h1>
                <p className="text-sm text-gray-500 mt-1">
                    View and print completed inspection reports
                </p>
            </div>

            <div className="space-y-3">
                {jobs.map((job) => (
                    <Card key={job.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <div className="flex items-center gap-3">
                                <FileBarChart className="h-5 w-5 text-blue-600" />
                                <div>
                                    <CardTitle className="text-base">{job.address}</CardTitle>
                                    <p className="text-sm text-gray-500">
                                        {job.builder?.name} • {format(new Date(job.createdAt), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                            <Link href={`/dashboard/reports/${job.id}`}>
                                <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4 mr-2" />
                                    View Report
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Inspector</p>
                                    <p className="font-medium">{job.inspector?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Job Type</p>
                                    <p className="font-medium">{job.inspections[0]?.type.replace('_', ' ') || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status</p>
                                    <p className="font-medium">{job.status}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {jobs.length === 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center py-12 text-gray-500">
                                No completed reports yet.
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
