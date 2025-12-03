'use client'

import { motion } from "framer-motion"
import { VehicleInput } from "@/lib/schemas"
import { VehicleCard } from "./vehicle-card"

interface VehicleGridProps {
    vehicles: (VehicleInput & { id: string })[]
    users: { id: string; name: string | null }[]
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

export function VehicleGrid({ vehicles, users }: VehicleGridProps) {
    if (vehicles.length === 0) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-gray-500">
                <p>No vehicles found.</p>
                <p className="text-sm">Add a new vehicle to get started.</p>
            </div>
        )
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} users={users} />
            ))}
        </motion.div>
    )
}
