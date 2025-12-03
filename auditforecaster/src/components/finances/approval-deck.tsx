'use client'

import { useState, useEffect } from "react"
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, MapPin, User } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { processExpense } from "@/app/actions/expenses"
import { toast } from "sonner"

interface Expense {
    id: string
    amount: number
    description: string | null
    date: Date
    category: string | null
    receiptUrl: string | null
    user: {
        name: string | null
        email: string
        image: string | null
    }
    job: {
        address: string
        lotNumber: string
    } | null
}

export function ApprovalDeck({ initialExpenses }: { initialExpenses: Expense[] }) {
    const [expenses] = useState(initialExpenses)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)

    // If no more expenses
    if (currentIndex >= expenses.length) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="rounded-full bg-green-100 p-6">
                    <Check className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending expenses to review.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
            </div>
        )
    }

    const currentExpense = expenses[currentIndex]
    if (!currentExpense) return null

    const handleVote = async (approved: boolean) => {
        if (isProcessing) return
        setIsProcessing(true)

        try {
            await processExpense(currentExpense.id, approved ? 'APPROVED' : 'REJECTED')
            toast.success(approved ? "Expense Approved" : "Expense Rejected")
            setCurrentIndex(prev => prev + 1)
        } catch {
            toast.error("Failed to process expense")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-md mx-auto relative">
            <div className="relative w-full aspect-[3/4]">
                {/* Background Cards (Stack Effect) */}
                {expenses[currentIndex + 1] && (
                    <Card className="absolute top-4 left-0 right-0 bottom-4 scale-95 opacity-50 z-0 bg-muted" />
                )}

                {/* Active Card */}
                <SwipeCard
                    key={currentExpense.id}
                    expense={currentExpense}
                    onVote={handleVote}
                    disabled={isProcessing}
                />
            </div>

            <div className="flex gap-8 mt-8">
                <Button
                    size="lg"
                    variant="outline"
                    className="h-16 w-16 rounded-full border-red-200 hover:bg-red-50 hover:border-red-500 text-red-500"
                    onClick={() => handleVote(false)}
                    disabled={isProcessing}
                >
                    <X className="h-8 w-8" />
                </Button>
                <Button
                    size="lg"
                    variant="outline"
                    className="h-16 w-16 rounded-full border-green-200 hover:bg-green-50 hover:border-green-500 text-green-500"
                    onClick={() => handleVote(true)}
                    disabled={isProcessing}
                >
                    <Check className="h-8 w-8" />
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
                Use Arrow Keys (← Reject | Approve →)
            </p>
        </div>
    )
}

function SwipeCard({ expense, onVote, disabled }: { expense: Expense, onVote: (approved: boolean) => void, disabled: boolean }) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-30, 30])
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])
    const controls = useAnimation()

    // Color overlays
    const bgGreen = useTransform(x, [0, 150], [0, 0.2])
    const bgRed = useTransform(x, [-150, 0], [0.2, 0])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled) return
            if (e.key === 'ArrowRight') {
                controls.start({ x: 500, opacity: 0, transition: { duration: 0.2 } }).then(() => onVote(true))
            } else if (e.key === 'ArrowLeft') {
                controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } }).then(() => onVote(false))
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [disabled, onVote, controls])

    const handleDragEnd = async (event: unknown, info: PanInfo) => {
        const offset = info.offset.x
        const velocity = info.velocity.x

        if (offset > 100 || velocity > 500) {
            await controls.start({ x: 500, opacity: 0 })
            onVote(true)
        } else if (offset < -100 || velocity < -500) {
            await controls.start({ x: -500, opacity: 0 })
            onVote(false)
        } else {
            controls.start({ x: 0, rotate: 0 })
        }
    }

    return (
        <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            style={{ x, rotate, opacity }}
            animate={controls}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
            whileTap={{ scale: 1.05 }}
        >
            <Card className="h-full w-full overflow-hidden shadow-xl border-2 relative bg-background">
                {/* Overlay Indicators */}
                <motion.div style={{ opacity: bgGreen }} className="absolute inset-0 bg-green-500 z-20 pointer-events-none flex items-center justify-center">
                    <Check className="h-32 w-32 text-white opacity-50" />
                </motion.div>
                <motion.div style={{ opacity: bgRed }} className="absolute inset-0 bg-red-500 z-20 pointer-events-none flex items-center justify-center">
                    <X className="h-32 w-32 text-white opacity-50" />
                </motion.div>

                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <Badge variant="outline" className="mb-2">{expense.category || 'Uncategorized'}</Badge>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{formatCurrency(expense.amount)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Description</div>
                        <p className="text-lg font-medium leading-tight">{expense.description || 'No description provided'}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2">
                            <User className="h-3 w-3" /> Inspector
                        </div>
                        <p>{expense.user.name || expense.user.email}</p>
                    </div>

                    {expense.job && (
                        <div className="space-y-1">
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Job Site
                            </div>
                            <p>{expense.job.address}</p>
                            <p className="text-sm text-muted-foreground">Lot {expense.job.lotNumber}</p>
                        </div>
                    )}

                    {expense.receiptUrl && (
                        <div className="mt-4 p-2 bg-muted rounded-md text-center text-sm text-muted-foreground">
                            Receipt Attached (Tap to View)
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
