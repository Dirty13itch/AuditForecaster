import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { ClipboardList, FileText, AlertCircle, Calendar } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function BuilderDashboard() {
    const session = await auth();
    const user = session?.user;
    const builderId = user?.builderId;
    console.log('Builder Dashboard Session:', JSON.stringify(session, null, 2));

    if (!builderId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You must be linked to a builder account to view this dashboard.</p>
            </div>
        );
    }

    // Fetch real stats
    const activeJobsCount = await prisma.job.count({
        where: {
            builderId,
            status: { not: 'COMPLETED' }
        }
    });

    const completedReportsCount = await prisma.inspection.count({
        where: {
            job: { builderId },
            status: 'COMPLETED'
        }
    });

    const pendingReportsCount = await prisma.inspection.count({
        where: {
            job: { builderId },
            status: { not: 'COMPLETED' }
        }
    });

    const recentActivity = await prisma.inspection.findMany({
        where: { job: { builderId } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { job: true }
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Builder Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {user?.name}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeJobsCount}</div>
                        <p className="text-xs text-muted-foreground">Projects in progress</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Inspections</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingReportsCount}</div>
                        <p className="text-xs text-muted-foreground">Waiting for completion</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Reports</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedReportsCount}</div>
                        <p className="text-xs text-muted-foreground">Available for download</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.length === 0 ? (
                                <p className="text-muted-foreground">No recent activity</p>
                            ) : (
                                recentActivity.map((inspection) => (
                                    <div key={inspection.id} className="flex items-center">
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {inspection.status === 'COMPLETED' ? 'Inspection Completed' : 'Inspection Updated'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {inspection.job.lotNumber} - {inspection.job.streetAddress}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium text-sm text-muted-foreground">
                                            {new Date(inspection.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/dashboard/builder/jobs" className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors">
                            <span className="text-sm font-medium">View All Jobs</span>
                            <ClipboardList className="h-4 w-4" />
                        </Link>
                        <Link href="/dashboard/builder/plans" className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors">
                            <span className="text-sm font-medium">Builder Plans</span>
                            <FileText className="h-4 w-4" />
                        </Link>
                        <Link href="/dashboard/builder/schedule" className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors">
                            <span className="text-sm font-medium">Schedule</span>
                            <Calendar className="h-4 w-4" />
                        </Link>
                        <Link href="/dashboard/settings" className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md transition-colors">
                            <span className="text-sm font-medium">Update Profile</span>
                            <ClipboardList className="h-4 w-4" />
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
