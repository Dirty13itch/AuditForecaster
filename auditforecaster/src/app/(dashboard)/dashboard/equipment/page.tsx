import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wrench, User } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Equipment",
    description: "Track company equipment and assignments.",
}

function statusBadge(status: string) {
    switch (status) {
        case "Active":
        case "ACTIVE":
            return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>
        case "CALIBRATION_DUE":
            return <Badge variant="destructive" className="bg-orange-100 text-orange-700 border-orange-200">Cal Due</Badge>
        case "REPAIR":
            return <Badge variant="destructive">Repair</Badge>
        case "RETIRED":
            return <Badge variant="secondary">Retired</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

export default async function EquipmentPage() {
    const equipment = await prisma.equipment.findMany({
        include: { assignedUser: true },
        orderBy: { name: 'asc' },
    })

    const byUser: Record<string, typeof equipment> = {}
    for (const item of equipment) {
        const key = item.assignedUser?.name ?? 'Unassigned'
        if (!byUser[key]) byUser[key] = []
        byUser[key].push(item)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
                <p className="text-sm text-muted-foreground">
                    {equipment.length} items tracked
                </p>
            </div>

            {Object.entries(byUser).map(([userName, items]) => (
                <Card key={userName}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {userName}
                            <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between border rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        <Wrench className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.type} &middot; {item.serialNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusBadge(item.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            {equipment.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No equipment tracked yet.
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
