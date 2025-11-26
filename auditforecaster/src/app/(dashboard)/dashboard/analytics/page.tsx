import { getExecutiveMetrics, getRevenueTrend } from "@/app/actions/analytics"
import { KPICards } from "@/components/analytics/kpi-cards"
import { RevenueChart } from "@/components/analytics/revenue-chart"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default async function AnalyticsPage() {
    const metrics = await getExecutiveMetrics()
    const trend = await getRevenueTrend()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Executive Dashboard</h2>
                    <p className="text-muted-foreground">High-level overview of business performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Placeholder for Date Range Picker */}
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                </div>
            </div>

            <KPICards metrics={metrics} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <RevenueChart data={trend} />
                </div>
                <div className="col-span-3">
                    {/* Placeholder for Inspection Breakdown or Recent Activity */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow h-full p-6 flex items-center justify-center text-muted-foreground">
                        Inspection Breakdown Chart (Coming Soon)
                    </div>
                </div>
            </div>
        </div>
    )
}
