'use client'

import { motion } from "framer-motion"
import { VehicleInput } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Car, Calendar, Gauge, Settings, Trash } from "lucide-react"
import { deleteVehicle } from "@/app/actions/fleet"
import { VehicleDialog } from "./vehicle-dialog"
import { useToast } from "@/components/ui/use-toast"

interface VehicleCardProps {
    vehicle: VehicleInput & { id: string }
    users: { id: string; name: string | null }[]
}

export function VehicleCard({ vehicle, users }: VehicleCardProps) {
    const { toast } = useToast()

    async function handleDelete() {
        if (confirm("Are you sure you want to delete this vehicle?")) {
            const result = await deleteVehicle(vehicle.id)
            if (result.message.includes("success")) {
                toast({ title: "Vehicle deleted" })
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" })
            }
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition-colors hover:bg-white/10"
        >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-lg font-bold text-orange-400 ring-1 ring-orange-500/20">
                        <Car className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{vehicle.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className={
                    vehicle.status === 'ACTIVE' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
                        vehicle.status === 'MAINTENANCE' ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400" :
                            "border-gray-500/20 bg-gray-500/10 text-gray-400"
                }>
                    {vehicle.status}
                </Badge>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        <span>Mileage</span>
                    </div>
                    <span className="text-white font-medium">{vehicle.mileage.toLocaleString()} mi</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Next Service</span>
                    </div>
                    <span className="text-white font-medium">
                        {vehicle.nextService ? new Date(vehicle.nextService).toLocaleDateString() : "N/A"}
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs border border-white/10 px-1 rounded">LP</span>
                        <span>Plate</span>
                    </div>
                    <span className="text-white font-medium">{vehicle.licensePlate}</span>
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <div className="text-xs text-gray-500">
                    {vehicle.assignedTo ? (
                        <span className="text-blue-400">Assigned to {users.find(u => u.id === vehicle.assignedTo)?.name || 'Unknown'}</span>
                    ) : (
                        <span className="italic">Unassigned</span>
                    )}
                </div>
                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <VehicleDialog
                        mode="edit"
                        vehicle={vehicle}
                        users={users}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
                                <Settings className="h-3 w-3" />
                            </Button>
                        }
                    />
                    <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-white/10">
                        <Trash className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
