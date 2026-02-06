import { RevenueChart, BuilderDistributionChart } from "@/components/analytics-charts"
import { DashboardStats } from "@/components/dashboard-stats"

import { Metadata } from "next"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Overview of your inspection tasks, recent activity, and quick actions.",
}

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>
            <DashboardStats />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart />
                <BuilderDistributionChart />
            </div>
        </div>
    )
}
