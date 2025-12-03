import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    description?: string
    icon: LucideIcon
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
}

export function StatCard({ title, value, description, icon: Icon, trend, trendValue }: StatCardProps) {
    return (
        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
                <Icon className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{value}</div>
                {(description || trendValue) && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        {trend === 'up' && <span className="text-emerald-400">↑ {trendValue}</span>}
                        {trend === 'down' && <span className="text-red-400">↓ {trendValue}</span>}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
