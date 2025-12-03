import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, HardHat, Activity } from "lucide-react"
import { RevenueChart, BuilderDistributionChart } from "@/components/analytics-charts"

import { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Overview of your inspection tasks, recent activity, and quick actions.",
}

export default async function DashboardPage() {
    const [
        invoicedJobsCount,
        activeJobsCount,
        buildersCount,
        totalJobsCount,
        completedJobsCount
    ] = await prisma.$transaction([
        prisma.job.count({ where: { status: 'INVOICED' } }),
        prisma.job.count({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
        prisma.builder.count(),
        prisma.job.count(),
        prisma.job.count({ where: { status: { in: ['COMPLETED', 'REVIEWED', 'INVOICED'] } } })
    ])

    // Mock revenue calculation: $450 per invoiced job
    const totalRevenue = invoicedJobsCount * 450

    const completionRate = totalJobsCount > 0
        ? Math.round((completedJobsCount / totalJobsCount) * 100)
        : 0

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h2 className="text-sm font-medium tracking-tight">Total Revenue</h2>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {invoicedJobsCount} jobs invoiced
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h2 className="text-sm font-medium tracking-tight">Active Jobs</h2>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeJobsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            In progress or assigned
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h2 className="text-sm font-medium tracking-tight">Builders</h2>
                        <HardHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{buildersCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Active partnerships
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h2 className="text-sm font-medium tracking-tight">Completion Rate</h2>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completionRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {completedJobsCount} of {totalJobsCount} jobs
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart />
                <BuilderDistributionChart />
            </div>
        </div>
    )
}
