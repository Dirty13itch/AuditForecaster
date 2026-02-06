import { prisma } from '@/lib/prisma';
import { VehicleGrid } from '@/components/assets/fleet/vehicle-grid';
import { VehicleDialog } from '@/components/assets/fleet/vehicle-dialog';

export const metadata = {
    title: 'Fleet | Field Inspect',
    description: 'Manage vehicle fleet',
};

export default async function FleetPage() {
    const vehicles = await prisma.vehicle.findMany({
        orderBy: { name: 'asc' },
    });

    const users = await prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    const formattedVehicles = vehicles.map(v => ({
        ...v,
        status: v.status as "ACTIVE" | "MAINTENANCE" | "RETIRED",
        assignedTo: v.assignedTo || undefined,
        vin: v.vin || undefined,
        nextService: v.nextService || undefined
    }));

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Fleet</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your vehicle fleet and assignments.
                    </p>
                </div>
                <VehicleDialog mode="create" users={users} />
            </div>

            <VehicleGrid vehicles={formattedVehicles} users={users} />
        </div>
    );
}
