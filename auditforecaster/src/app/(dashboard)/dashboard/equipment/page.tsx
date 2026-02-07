import { prisma } from "@/lib/prisma"
import { EquipmentList } from "@/components/equipment-list"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Equipment",
    description: "Track company equipment and assignments.",
}

export default async function EquipmentPage() {
    const [equipment, inspectors] = await Promise.all([
        prisma.equipment.findMany({
            include: { assignedUser: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        }),
        prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'INSPECTOR'] } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    // Filter out Pat from the assignable inspectors list
    const assignableInspectors = inspectors.filter(i =>
        !i.name?.includes('Building Knowledge') && !i.name?.includes('Pat')
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
                <p className="text-sm text-muted-foreground">
                    {equipment.length} items tracked &middot; Tap the arrow to reassign
                </p>
            </div>
            <EquipmentList equipment={equipment} inspectors={assignableInspectors} />
        </div>
    )
}
