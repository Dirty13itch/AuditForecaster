'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addMaintenanceLog } from "@/app/actions/fleet"
import { toast } from "sonner"
import { Loader2, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"

export function AddMaintenanceDialog({ vehicleId }: { vehicleId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData(e.currentTarget)

        try {
            await addMaintenanceLog({
                vehicleId,
                date: new Date(formData.get('date') as string),
                type: formData.get('type') as string,
                cost: parseFloat(formData.get('cost') as string),
                description: formData.get('description') as string,
                mileage: formData.get('mileage') ? parseInt(formData.get('mileage') as string) : undefined
            })

            toast.success("Maintenance log added")
            setIsOpen(false)
            router.refresh()
        } catch {
            toast.error("Failed to add log")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Wrench className="mr-2 h-4 w-4" /> Log Maintenance
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Maintenance</DialogTitle>
                    <DialogDescription>
                        Record a service or repair for this vehicle.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" name="date" type="date" required className="col-span-3" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select name="type" required>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OIL_CHANGE">Oil Change</SelectItem>
                                    <SelectItem value="TIRE_ROTATION">Tire Rotation</SelectItem>
                                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                                    <SelectItem value="REPAIR">Repair</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cost" className="text-right">Cost</Label>
                            <Input id="cost" name="cost" type="number" step="0.01" required className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="mileage" className="text-right">Mileage</Label>
                            <Input id="mileage" name="mileage" type="number" className="col-span-3" placeholder="Odometer reading" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Notes</Label>
                            <Input id="description" name="description" className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
