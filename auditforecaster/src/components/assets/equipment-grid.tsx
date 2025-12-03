'use client'

import { Equipment } from "@prisma/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, isBefore } from "date-fns"
import { AssetQRCode } from "@/components/assets/asset-qr-code"
import { cn } from "@/lib/utils"

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
}

interface EquipmentGridProps {
    equipment: Equipment[]
}

export function EquipmentGrid({ equipment }: EquipmentGridProps) {
    if (equipment.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-background/40 backdrop-blur-md rounded-xl border border-white/10">
                No equipment found. Add your first item above.
            </div>
        )
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {equipment.map((eq) => {
                const isOverdue = eq.nextCalibration && isBefore(eq.nextCalibration, new Date())

                return (
                    <motion.div key={eq.id} variants={item} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                        <Card className="h-full bg-background/40 backdrop-blur-md border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-bold truncate pr-2">
                                    {eq.name}
                                </CardTitle>
                                <AssetQRCode
                                    assetId={eq.id}
                                    name={eq.name}
                                    serialNumber={eq.serialNumber}
                                />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="font-medium">{eq.type}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Serial</span>
                                        <span className="font-mono text-xs">{eq.serialNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge
                                            variant={eq.status === 'ACTIVE' ? 'default' : 'secondary'}
                                            className={cn(
                                                eq.status === 'ACTIVE' && "bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/20",
                                                eq.status === 'CALIBRATION_DUE' && "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 border-yellow-500/20",
                                                eq.status === 'REPAIR' && "bg-red-500/20 text-red-700 hover:bg-red-500/30 border-red-500/20",
                                            )}
                                        >
                                            {eq.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                                        <span className="text-muted-foreground">Calibration</span>
                                        {eq.nextCalibration ? (
                                            <span className={cn(
                                                "font-medium",
                                                isOverdue ? "text-red-600 font-bold animate-pulse" : "text-foreground"
                                            )}>
                                                {format(eq.nextCalibration, "MMM dd, yyyy")}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/50">N/A</span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )
            })}
        </motion.div>
    )
}
