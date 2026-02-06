'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Briefcase,
    CheckCircle2,
    DollarSign,
    ClipboardList,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react"
import { getDashboardStats, type DashboardStats } from "@/app/actions/dashboard"

interface StatCardProps {
    title: string
    value: string
    trend: number
    trendLabel: string
    icon: React.ReactNode
    loading: boolean
}

function StatCard({ title, value, trend, trendLabel, icon, loading }: StatCardProps) {
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
    const trendColor = trend > 0
        ? "text-emerald-600"
        : trend < 0
            ? "text-red-600"
            : "text-muted-foreground"

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <span className="text-muted-foreground">{icon}</span>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </div>
                ) : (
                    <>
                        <div className="text-2xl font-bold">{value}</div>
                        <p className={`flex items-center gap-1 text-xs ${trendColor}`}>
                            <TrendIcon className="h-3 w-3" />
                            <span>
                                {trend > 0 ? "+" : ""}
                                {trend}% {trendLabel}
                            </span>
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export function DashboardStats() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getDashboardStats()
            .then(setStats)
            .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats"))
            .finally(() => setLoading(false))
    }, [])

    if (error) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="col-span-full">
                    <CardContent className="pt-6">
                        <p className="text-sm text-destructive">
                            Failed to load dashboard stats: {error}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Jobs"
                value={stats?.totalJobs.toLocaleString() ?? "0"}
                trend={stats?.trends.totalJobs ?? 0}
                trendLabel="from last month"
                icon={<Briefcase className="h-4 w-4" />}
                loading={loading}
            />
            <StatCard
                title="Completed This Month"
                value={stats?.completedThisMonth.toLocaleString() ?? "0"}
                trend={stats?.trends.completed ?? 0}
                trendLabel="from last month"
                icon={<CheckCircle2 className="h-4 w-4" />}
                loading={loading}
            />
            <StatCard
                title="Revenue This Month"
                value={`$${(stats?.monthlyRevenue ?? 0).toLocaleString()}`}
                trend={stats?.trends.revenue ?? 0}
                trendLabel="from last month"
                icon={<DollarSign className="h-4 w-4" />}
                loading={loading}
            />
            <StatCard
                title="Pending Inspections"
                value={stats?.pendingInspections.toLocaleString() ?? "0"}
                trend={stats?.trends.inspections ?? 0}
                trendLabel="from last month"
                icon={<ClipboardList className="h-4 w-4" />}
                loading={loading}
            />
        </div>
    )
}
