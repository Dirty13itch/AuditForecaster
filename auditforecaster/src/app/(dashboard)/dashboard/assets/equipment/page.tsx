import { prisma } from '@/lib/prisma';
import { EquipmentDialog } from '@/components/assets/equipment-dialog';
import { EquipmentGrid } from '@/components/assets/equipment-grid';

export const metadata = {
    title: 'Equipment | AuditForecaster',
    description: 'Manage equipment inventory',
};

export default async function EquipmentPage() {
    const equipment = await prisma.equipment.findMany({
        orderBy: { name: 'asc' },
    });

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        Equipment
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Manage your fleet, track calibration, and ensure compliance.
                    </p>
                </div>
                <EquipmentDialog />
            </div>

            <EquipmentGrid equipment={equipment} />
        </div>
    );
}
