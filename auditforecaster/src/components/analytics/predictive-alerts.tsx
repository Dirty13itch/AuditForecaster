import { AlertTriangle, Info, Wrench } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Alert {
    id: string
    type: string
    message: string
    severity: string
}

interface PredictiveAlertsProps {
    alerts: Alert[]
}

export function PredictiveAlerts({ alerts }: PredictiveAlertsProps) {
    return (
        <Card className="col-span-3 border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    Predictive Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {alerts.length === 0 ? (
                        <p className="text-sm text-gray-500">No active risks detected. Systems nominal.</p>
                    ) : (
                        alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-4 rounded-lg border p-3 ${alert.severity === 'HIGH'
                                        ? 'border-red-500/20 bg-red-500/10'
                                        : 'border-yellow-500/20 bg-yellow-500/10'
                                    }`}
                            >
                                {alert.type === 'MAINTENANCE' ? (
                                    <Wrench className="mt-0.5 h-5 w-5 text-yellow-400" />
                                ) : (
                                    <Info className="mt-0.5 h-5 w-5 text-red-400" />
                                )}
                                <div className="space-y-1">
                                    <p className={`text-sm font-medium leading-none ${alert.severity === 'HIGH' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                        {alert.type}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                        {alert.message}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
