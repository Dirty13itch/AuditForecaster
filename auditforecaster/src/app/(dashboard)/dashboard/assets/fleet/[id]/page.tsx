import { getVehicleDetails } from "@/app/actions/fleet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import { formatCurrency } from "@/lib/utils"
import { AddMaintenanceDialog } from "./add-maintenance-dialog"

import { Vehicle, VehicleMaintenance, MileageLog } from "@prisma/client"

interface VehicleWithRelations extends Vehicle {
    maintenance: VehicleMaintenance[]
    mileageLogs: MileageLog[]
}

export default async function FleetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const vehicle = await getVehicleDetails(id) as VehicleWithRelations | null

    if (!vehicle) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/assets/fleet">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{vehicle.year} {vehicle.make} {vehicle.model}</h2>
                        <p className="text-muted-foreground">
                            {vehicle.licensePlate} • {vehicle.vin || 'No VIN'}
                        </p>
                    </div>
                </div>
                <AddMaintenanceDialog vehicleId={vehicle.id} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Mileage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicle.maintenance.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            No maintenance records.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    vehicle.maintenance.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{log.type}</Badge>
                                            </TableCell>
                                            <TableCell>{formatCurrency(log.cost)}</TableCell>
                                            <TableCell>{log.mileage?.toLocaleString() || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Trips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Distance</TableHead>
                                    <TableHead>Purpose</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicle.mileageLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                            No recent trips.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    vehicle.mileageLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                                            <TableCell>{log.distance.toFixed(1)} mi</TableCell>
                                            <TableCell>{log.purpose || '-'}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
