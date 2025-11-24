import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"

export default async function BuilderJobsPage() {
    const session = await auth()
    const builderId = session?.user?.builderId

    if (!builderId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You must be linked to a builder account to view jobs.</p>
            </div>
        )
    }

    const jobs = await prisma.job.findMany({
        where: { builderId },
        include: {
            inspections: {
                take: 1,
                orderBy: {
                    createdAt: 'desc'
                }
            },
            builder: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
                <p className="text-muted-foreground">Manage and track your construction projects.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Job List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Lot #</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Address</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Inspection</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {jobs.map((job) => (
                                    <tr key={job.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle font-medium">{job.lotNumber}</td>
                                        <td className="p-4 align-middle">{job.streetAddress}</td>
                                        <td className="p-4 align-middle">
                                            <Badge variant={job.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                {job.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 align-middle">
                                            {job.inspections[0] ? (
                                                <Badge variant="outline" className="text-green-600 border-green-600">
                                                    Completed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                                    Pending
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-4 align-middle">
                                            {format(new Date(job.createdAt), 'MMM d, yyyy')}
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <Link href={`/dashboard/builder/jobs/${job.id}`} className="text-blue-600 hover:underline">
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
