'use client'

import React, { useState } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Check, X, Car, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { classifyMileageLog } from '@/app/actions/finance'

interface MileageLog {
    id: string
    date: Date
    distance: number
    startLocation?: string | null
    endLocation?: string | null
}

interface MileageSwipeProps {
    logs: MileageLog[]
    onComplete: () => void
}

export function MileageSwipe({ logs, onComplete }: MileageSwipeProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [exitX, setExitX] = useState<number | null>(null)

    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-150, 0, 150], [0.5, 1, 0.5])
    
    // Background colors based on swipe direction
    const bg = useTransform(x, [-200, 0, 200], ['#ef4444', '#ffffff', '#22c55e'])

    if (currentIndex >= logs.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Check className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold">All Caught Up!</h3>
                <p className="text-muted-foreground">No more mileage logs to classify.</p>
                <button 
                    onClick={onComplete}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                    Done
                </button>
            </div>
        )
    }

    const currentLog = logs[currentIndex]!

    const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            // Swipe Right (Business)
            setExitX(200)
            await handleClassify('BUSINESS')
        } else if (info.offset.x < -100) {
            // Swipe Left (Personal)
            setExitX(-200)
            await handleClassify('PERSONAL')
        }
    }

    const handleClassify = async (type: 'BUSINESS' | 'PERSONAL') => {
        if (!currentLog) return

        try {
            const result = await classifyMileageLog(currentLog.id, type)
            if (result.error) {
                toast.error(result.error)
                setExitX(null) // Reset if error
            } else {
                toast.success(`Classified as ${type}`)
                setTimeout(() => {
                    setCurrentIndex(prev => prev + 1)
                    setExitX(null)
                    x.set(0)
                }, 200)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to classify')
            setExitX(null)
        }
    }



    return (
        <div className="relative w-full max-w-md mx-auto h-96 flex items-center justify-center overflow-hidden">
            {/* Background Indicators */}
            <div className="absolute inset-y-0 left-0 w-1/2 flex items-center justify-start pl-8 pointer-events-none">
                <X className="w-12 h-12 text-red-500 opacity-20" />
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 flex items-center justify-end pr-8 pointer-events-none">
                <Briefcase className="w-12 h-12 text-green-500 opacity-20" />
            </div>

            <motion.div
                key={currentLog.id}
                style={{ x, rotate, opacity, background: bg }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                animate={exitX !== null ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
                className="w-80 h-64 bg-card border rounded-xl shadow-xl flex flex-col items-center justify-center p-6 cursor-grab active:cursor-grabbing z-10"
            >
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Car className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-1">{currentLog.distance.toFixed(1)} miles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    {currentLog.date.toLocaleDateString()}
                </p>
                
                <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">From:</span>
                        <span className="font-medium truncate max-w-[150px]">{currentLog.startLocation || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">To:</span>
                        <span className="font-medium truncate max-w-[150px]">{currentLog.endLocation || 'Unknown'}</span>
                    </div>
                </div>

                <div className="absolute bottom-4 w-full px-6 flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Personal</span>
                    <span>Business</span>
                </div>
            </motion.div>
        </div>
    )
}
