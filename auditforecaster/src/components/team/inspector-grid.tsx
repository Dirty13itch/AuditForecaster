'use client'

import { motion } from "framer-motion"
import { InspectorInput } from "@/lib/schemas"
import { InspectorCard } from "./inspector-card"

interface InspectorGridProps {
    inspectors: (InspectorInput & { id: string; _count?: { jobs: number } })[]
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

export function InspectorGrid({ inspectors }: InspectorGridProps) {
    if (inspectors.length === 0) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 text-gray-500">
                <p>No inspectors found.</p>
                <p className="text-sm">Onboard a new inspector to get started.</p>
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
            {inspectors.map((inspector) => (
                <InspectorCard key={inspector.id} inspector={inspector} />
            ))}
        </motion.div>
    )
}
