import { getRevenueForecast, getInspectorPerformance } from "@/app/actions/advanced-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export default async function AdvancedAnalyticsPage() {
    const forecast = await getRevenueForecast()
    const performance = await getInspectorPerformance()

    if ('error' in forecast || 'error' in performance) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        Advanced Analytics is currently disabled or you do not have permission to view it.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Advanced Analytics</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Revenue Forecast Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>6-Month Revenue Forecast</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end space-x-4">
                            {forecast.map((item, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center group">
                                    <div className="w-full relative flex items-end h-full">
                                        {/* Projected Bar */}
                                        <div
                                            className="w-full bg-blue-200 rounded-t transition-all group-hover:bg-blue-300"
                                            style={{ height: `${(item.projected / 10000) * 100}%` }}
                                        ></div>
                                        {/* Actual Bar Overlay */}
                                        {item.actual > 0 && (
                                            <div
                                                className="absolute bottom-0 w-full bg-blue-600 rounded-t"
                                                style={{ height: `${(item.actual / 10000) * 100}%` }}
                                            ></div>
                                        )}
                                    </div>
                                    <span className="text-xs mt-2 text-gray-500">{item.month}</span>
                                    <span className="text-xs font-bold">${item.projected}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-center space-x-4 text-sm">
                            <div className="flex items-center"><div className="w-3 h-3 bg-blue-600 mr-2"></div> Actual</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-blue-200 mr-2"></div> Projected</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Inspector Performance Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inspector Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Jobs</th>
                                        <th className="px-6 py-3">Avg Score</th>
                                        <th className="px-6 py-3">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performance.map((inspector, index) => (
                                        <tr key={index} className="bg-white border-b">
                                            <td className="px-6 py-4 font-medium text-gray-900">{inspector.name}</td>
                                            <td className="px-6 py-4">{inspector.jobsCompleted}</td>
                                            <td className="px-6 py-4">{inspector.avgScore.toFixed(1)}</td>
                                            <td className="px-6 py-4">${inspector.revenueGenerated}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
