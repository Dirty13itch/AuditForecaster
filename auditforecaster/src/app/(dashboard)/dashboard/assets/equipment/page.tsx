import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export const metadata = {
    title: 'Equipment | AuditForecaster',
    description: 'Manage equipment inventory',
};

export default async function EquipmentPage() {
    const equipment = await prisma.equipment.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Equipment
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Calibration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {equipment.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No equipment found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                equipment.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.type}</TableCell>
                                        <TableCell>{item.serialNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.lastCalibration ? item.lastCalibration.toLocaleDateString() : 'N/A'}
                                        </TableCell>
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
