'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createEquipment, updateEquipment } from "@/app/actions/equipment"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

type Equipment = {
    id: string
    name: string
    type: string
    serialNumber: string
    status: string
    lastCalibration: Date | null
    nextCalibration: Date | null
    assignedTo: string | null
    notes: string | null
}

type User = {
    id: string
    name: string | null
}

interface EquipmentFormProps {
    equipment?: Equipment
    users: User[]
    onSuccess: () => void
}

export function EquipmentForm({ equipment, users, onSuccess }: EquipmentFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {
            name: formData.get("name"),
            type: formData.get("type"),
            serialNumber: formData.get("serialNumber"),
            status: formData.get("status"),
            notes: formData.get("notes"),
        }

        const lastCal = formData.get("lastCalibration")
        if (lastCal) data.lastCalibration = new Date(lastCal as string)

        const nextCal = formData.get("nextCalibration")
        if (nextCal) data.nextCalibration = new Date(nextCal as string)

        try {
            const result = equipment
                ? await updateEquipment(equipment.id, data)
                : await createEquipment(data)

            toast({
                title: result.message,
                variant: result.message.includes('Failed') ? 'destructive' : 'default'
            })

            if (!result.message.includes('Failed')) {
                onSuccess()
                router.refresh()
            }
        } catch {
            toast({
                title: "An error occurred",
                description: "Please try again later",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Equipment Name</Label>
                    <Input id="name" name="name" defaultValue={equipment?.name} required placeholder="Retrotec 5000" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue={equipment?.type || "Blower Door"}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Blower Door">Blower Door</SelectItem>
                            <SelectItem value="Duct Blaster">Duct Blaster</SelectItem>
                            <SelectItem value="Infrared Camera">Infrared Camera</SelectItem>
                            <SelectItem value="Combustion Analyzer">Combustion Analyzer</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input id="serialNumber" name="serialNumber" defaultValue={equipment?.serialNumber} required placeholder="SN-12345" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={equipment?.status || "ACTIVE"}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="CALIBRATION_DUE">Calibration Due</SelectItem>
                            <SelectItem value="REPAIR">In Repair</SelectItem>
                            <SelectItem value="RETIRED">Retired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="lastCalibration">Last Calibration</Label>
                    <Input
                        id="lastCalibration"
                        name="lastCalibration"
                        type="date"
                        defaultValue={equipment?.lastCalibration ? format(new Date(equipment.lastCalibration), 'yyyy-MM-dd') : ''}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nextCalibration">Next Calibration Due</Label>
                    <Input
                        id="nextCalibration"
                        name="nextCalibration"
                        type="date"
                        defaultValue={equipment?.nextCalibration ? format(new Date(equipment.nextCalibration), 'yyyy-MM-dd') : ''}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select name="assignedTo" defaultValue={equipment?.assignedTo || "unassigned"}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={equipment?.notes || ''} placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (equipment ? "Update Equipment" : "Add Equipment")}
                </Button>
            </div>
        </form>
    )
}
