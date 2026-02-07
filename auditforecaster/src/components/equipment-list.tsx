'use client'

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wrench, User, ArrowRightLeft } from "lucide-react"
import { assignEquipment, returnEquipment } from "@/app/actions/equipment"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type EquipmentItem = {
    id: string
    name: string
    type: string
    serialNumber: string
    status: string
    assignedTo: string | null
    assignedUser: { id: string; name: string | null } | null
}

type Inspector = {
    id: string
    name: string | null
}

function statusBadge(status: string) {
    switch (status) {
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

export function EquipmentList({ equipment, inspectors }: { equipment: EquipmentItem[], inspectors: Inspector[] }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [reassigningId, setReassigningId] = useState<string | null>(null)

    const byUser: Record<string, EquipmentItem[]> = {}
    for (const item of equipment) {
        const key = item.assignedUser?.name ?? 'Unassigned'
        if (!byUser[key]) byUser[key] = []
        byUser[key].push(item)
    }

    const handleReassign = (equipmentId: string, userId: string) => {
        startTransition(async () => {
            const result = await assignEquipment(equipmentId, userId)
            if (result.success) {
                toast.success(result.message)
                setReassigningId(null)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    const handleReturn = (equipmentId: string) => {
        startTransition(async () => {
            const result = await returnEquipment(equipmentId)
            if (result.success) {
                toast.success(result.message)
                setReassigningId(null)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <div className="space-y-4">
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
                                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
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
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-10 w-10 md:h-7 md:w-7 p-0"
                                                onClick={() => setReassigningId(reassigningId === item.id ? null : item.id)}
                                                disabled={isPending}
                                                aria-label="Reassign equipment"
                                            >
                                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Reassign panel */}
                                    {reassigningId === item.id && (
                                        <div className="flex gap-2 pt-2 border-t flex-wrap">
                                            <span className="text-xs text-muted-foreground self-center mr-1">Assign to:</span>
                                            {inspectors.map(inspector => (
                                                <Button
                                                    key={inspector.id}
                                                    size="sm"
                                                    variant={item.assignedTo === inspector.id ? "default" : "outline"}
                                                    className="text-xs h-7"
                                                    onClick={() => handleReassign(item.id, inspector.id)}
                                                    disabled={isPending || item.assignedTo === inspector.id}
                                                >
                                                    {inspector.name}
                                                </Button>
                                            ))}
                                            {item.assignedTo && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-xs h-7"
                                                    onClick={() => handleReturn(item.id)}
                                                    disabled={isPending}
                                                >
                                                    Return
                                                </Button>
                                            )}
                                        </div>
                                    )}
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
