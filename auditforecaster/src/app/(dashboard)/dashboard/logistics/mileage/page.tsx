import { MileageTracker } from '@/components/logistics/mileage-tracker'
import { RouteOptimizer } from '@/components/logistics/route-optimizer'
import { getMileageLogs } from '@/app/actions/mileage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function MileagePage() {
    const logs = await getMileageLogs()

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Logistics & Mileage</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <RouteOptimizer />
                    <MileageTracker />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Distance</TableHead>
                                    <TableHead>Purpose</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(log.date, 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{log.vehicle.name}</TableCell>
                                        <TableCell>{log.distance} mi</TableCell>
                                        <TableCell>{log.purpose}</TableCell>
                                    </TableRow>
                                ))}
                                {logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">No logs found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
