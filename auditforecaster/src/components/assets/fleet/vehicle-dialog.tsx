'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { VehicleInput, VehicleSchema } from "@/lib/schemas"
import { useSync } from "@/providers/sync-provider"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus } from "lucide-react"

interface VehicleDialogProps {
    mode: "create" | "edit"
    vehicle?: VehicleInput & { id: string }
    users: { id: string; name: string | null }[]
    trigger?: React.ReactNode
}

export function VehicleDialog({ mode, vehicle, users, trigger }: VehicleDialogProps) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()
    const { engine } = useSync()

    const form = useForm<VehicleInput>({
        resolver: zodResolver(VehicleSchema) as any,
        defaultValues: {
            name: vehicle?.name || "",
            make: vehicle?.make || "",
            model: vehicle?.model || "",
            year: vehicle?.year || new Date().getFullYear(),
            licensePlate: vehicle?.licensePlate || "",
            vin: vehicle?.vin || "",
            mileage: vehicle?.mileage || 0,
            status: (vehicle?.status as any) || "ACTIVE",
            assignedTo: vehicle?.assignedTo || "",
            nextService: vehicle?.nextService,
        },
    })

    async function onSubmit(data: VehicleInput) {
        try {
            if (mode === "create") {
                await engine.enqueue('CREATE', 'vehicle', data)
            } else {
                if (!vehicle?.id) return
                await engine.enqueue('UPDATE', 'vehicle', { ...data, id: vehicle.id })
            }

            toast({
                title: "Saved",
                description: "Vehicle saved. Syncing in background...",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Failed to enqueue:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save vehicle locally.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                        <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-white/10 bg-black/80 backdrop-blur-xl text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{mode === "create" ? "Add Vehicle" : "Edit Vehicle"}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter vehicle details and assignment.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Truck 01" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="licensePlate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">License Plate</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ABC-123" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Year</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="make"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Make</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ford" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Model</FormLabel>
                                        <FormControl>
                                            <Input placeholder="F-150" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="mileage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Mileage</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                                <SelectItem value="RETIRED">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="assignedTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Assigned To</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                    <SelectValue placeholder="Unassigned" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="nextService"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Next Service</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                {form.formState.isSubmitting ? "Saving..." : "Save Vehicle"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
