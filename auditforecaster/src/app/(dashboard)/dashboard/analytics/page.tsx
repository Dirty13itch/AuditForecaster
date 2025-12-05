import { getAnalyticsData, getPredictiveInsights } from "@/app/actions/analytics"
import { StatCard } from "@/components/analytics/stat-card"
import { RevenueChart } from "@/components/analytics/revenue-chart"
import { PredictiveAlerts } from "@/components/analytics/predictive-alerts"
import { DollarSign, Activity, Users, CheckCircle } from "lucide-react"
import { ScenarioBuilder } from "@/components/analytics/scenario-builder"

export const metadata = {
    title: 'Analytics | AuditForecaster',
}

export default async function AnalyticsPage() {
    const [data, insights] = await Promise.all([
        getAnalyticsData(),
        getPredictiveInsights()
    ])

    const alerts = [...insights.atRiskJobs, ...insights.calibrationWarnings]

    return (
        <div className="space-y-8 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Analytics & Insights</h2>
                    <p className="text-gray-400">Real-time data intelligence and predictive risk assessment.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Revenue (MTD)"
                    value={`$${data.revenue.current.toLocaleString()}`}
                    icon={DollarSign}
                    trend={data.revenue.growth >= 0 ? 'up' : 'down'}
                    trendValue={`${data.revenue.growth.toFixed(1)}%`}
                    description={`Projected: $${data.revenue.projected.toLocaleString()}`}
                />
                <StatCard
                    title="Jobs Completed"
                    value={data.jobDistribution.find(d => d.name === 'COMPLETED')?.value || 0}
                    icon={CheckCircle}
                    description="Total completed jobs"
                />
                <StatCard
                    title="Active Inspectors"
                    value={data.topInspectors.length}
                    icon={Users}
                    description="Currently active in field"
                />
                <StatCard
                    title="System Health"
                    value="98%"
                    icon={Activity}
                    description="Operational Uptime"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <RevenueChart data={data.dailyTrend} />
                <PredictiveAlerts alerts={alerts} />
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">HERS Score Projection (Ekotrope Simulation)</h3>
                <ScenarioBuilder />
            </div>
        </div>
    )
}
