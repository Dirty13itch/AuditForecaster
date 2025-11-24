'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createVehicle, updateVehicle } from "@/app/actions/fleet"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type Vehicle = {
    id: string
    name: string
    make: string
    model: string
    year: number
    licensePlate: string
    vin?: string | null
    mileage: number
    status: string
    nextService?: Date | null
    assignedTo?: string | null
}

type User = {
    id: string
    name: string | null
}

interface VehicleFormProps {
    vehicle?: Vehicle
    users: User[]
    onSuccess: () => void
}

export function VehicleForm({ vehicle, users, onSuccess }: VehicleFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            const result = vehicle
                ? await updateVehicle(vehicle.id, null, formData)
                : await createVehicle(null, formData)

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
                    <Label htmlFor="name">Vehicle Name</Label>
                    <Input id="name" name="name" defaultValue={vehicle?.name} required placeholder="e.g. Truck 01" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input id="licensePlate" name="licensePlate" defaultValue={vehicle?.licensePlate} required />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" name="year" type="number" defaultValue={vehicle?.year} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" defaultValue={vehicle?.make} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" defaultValue={vehicle?.model} required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="vin">VIN (Optional)</Label>
                    <Input id="vin" name="vin" defaultValue={vehicle?.vin || ''} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage" name="mileage" type="number" defaultValue={vehicle?.mileage} required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={vehicle?.status || "ACTIVE"}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            <SelectItem value="RETIRED">Retired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assigned To</Label>
                    <Select name="assignedTo" defaultValue={vehicle?.assignedTo || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="nextService">Next Service Date</Label>
                <Input
                    id="nextService"
                    name="nextService"
                    type="date"
                    defaultValue={vehicle?.nextService ? new Date(vehicle.nextService).toISOString().split('T')[0] : ''}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (vehicle ? "Update Vehicle" : "Add Vehicle")}
                </Button>
            </div>
        </form>
    )
}
