'use client'

import { motion } from "framer-motion"
import { InspectorInput } from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { InspectorDialog } from "@/components/team/inspector-dialog"
import { DeleteUserButton } from "@/components/delete-user-button"
import { Button } from "@/components/ui/button"
import { Pencil, ShieldCheck, Mail, Phone, Award } from "lucide-react"

interface InspectorCardProps {
    inspector: InspectorInput & { id: string; _count?: { jobs: number } }
}

export function InspectorCard({ inspector }: InspectorCardProps) {
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
            {/* Glass Shine Effect */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-lg font-bold text-blue-400 ring-1 ring-blue-500/20">
                        {inspector.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{inspector.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <ShieldCheck className="h-3 w-3 text-emerald-400" />
                            <span>HERS: {inspector.hersRaterId || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    Active
                </Badge>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="h-3 w-3" />
                    <span>{inspector.email}</span>
                </div>
                {inspector.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone className="h-3 w-3" />
                        <span>{inspector.phone}</span>
                    </div>
                )}
            </div>

            <div className="mt-6">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <Award className="h-3 w-3" />
                    <span>Certifications</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {inspector.certifications && inspector.certifications.length > 0 ? (
                        inspector.certifications.map((cert, i) => (
                            <Badge key={i} variant="secondary" className="bg-white/5 text-xs text-gray-300 hover:bg-white/10">
                                {cert.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs italic text-gray-600">No certifications</span>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <div className="text-xs text-gray-500">
                    <span className="text-white font-medium">{inspector._count?.jobs || 0}</span> Assignments
                </div>
                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <InspectorDialog
                        mode="edit"
                        inspector={inspector}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
                                <Pencil className="h-3 w-3" />
                            </Button>
                        }
                    />
                    <DeleteUserButton id={inspector.id} />
                </div>
            </div>
        </motion.div>
    )
}
