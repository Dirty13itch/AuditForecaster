import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const metadata = {
    title: 'Fleet | AuditForecaster',
    description: 'Manage vehicle fleet',
};

export default async function FleetPage() {
    const vehicles = await prisma.vehicle.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Fleet</h1>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Vehicles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>License Plate</TableHead>
                                <TableHead>Make/Model</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mileage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No vehicles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                vehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-medium">{vehicle.name}</TableCell>
                                        <TableCell>{vehicle.licensePlate}</TableCell>
                                        <TableCell>{vehicle.make} {vehicle.model} ({vehicle.year})</TableCell>
                                        <TableCell>
                                            <Badge variant={vehicle.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {vehicle.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{vehicle.mileage.toLocaleString()} mi</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
