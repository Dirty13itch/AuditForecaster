import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ProfitData {
    revenue: number
    costs: {
        labor: number
        expenses: number
        mileage: number
        total: number
    }
    netProfit: number
    margin: number
}

export function JobProfitCard({ data }: { data: ProfitData }) {
    const isPositive = data.netProfit >= 0

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Job Profitability</CardTitle>
                {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                    {data.margin.toFixed(1)}% Margin
                </p>

                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium">{formatCurrency(data.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-red-500/80">
                        <span>Labor Cost</span>
                        <span>-{formatCurrency(data.costs.labor)}</span>
                    </div>
                    <div className="flex justify-between text-red-500/80">
                        <span>Expenses</span>
                        <span>-{formatCurrency(data.costs.expenses)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
