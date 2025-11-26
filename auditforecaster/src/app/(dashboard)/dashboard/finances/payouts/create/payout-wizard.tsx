'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { calculatePayout, createPayout } from "@/app/actions/payouts"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, Calculator, CheckCircle } from "lucide-react"

interface Inspector {
    id: string
    name: string | null
    email: string
}

interface PayoutPreview {
    totalAmount: number
    baseRate: number
    jobCount: number
    jobs: {
        id: string
        address: string
        date: Date | null
        jobTotal: number
        payoutAmount: number
    }[]
}

export function PayoutWizard({ inspectors }: { inspectors: Inspector[] }) {
    const [step, setStep] = useState(1)
    const [selectedInspectorId, setSelectedInspectorId] = useState<string>("")
    const [periodStart, setPeriodStart] = useState<string>("")
    const [periodEnd, setPeriodEnd] = useState<string>("")

    const [preview, setPreview] = useState<PayoutPreview | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const router = useRouter()

    const handleCalculate = async () => {
        if (!selectedInspectorId || !periodStart || !periodEnd) return

        setIsCalculating(true)
        try {
            const result = await calculatePayout(
                selectedInspectorId,
                new Date(periodStart),
                new Date(periodEnd)
            )
            setPreview(result)
            setStep(2)
        } catch (error) {
            toast.error("Failed to calculate payout")
            console.error(error)
        } finally {
            setIsCalculating(false)
        }
    }

    const handleCreate = async () => {
        if (!preview || !selectedInspectorId) return

        setIsSubmitting(true)
        try {
            const jobIds = preview.jobs.map(j => j.id)
            const result = await createPayout(
                selectedInspectorId,
                jobIds,
                preview.totalAmount + preview.baseRate,
                new Date(periodStart),
                new Date(periodEnd)
            )

            if (result.success) {
                toast.success("Payout generated successfully")
                router.push(`/dashboard/finances/payouts/${result.payoutId}`)
            }
        } catch (error) {
            toast.error("Failed to generate payout")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="grid gap-6">
            {/* Step 1: Configuration */}
            <Card className={step === 1 ? 'border-primary' : ''}>
                <CardHeader>
                    <CardTitle>1. Payout Configuration</CardTitle>
                    <CardDescription>Select inspector and pay period.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Inspector</Label>
                        <Select
                            value={selectedInspectorId}
                            onValueChange={setSelectedInspectorId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select an inspector..." />
                            </SelectTrigger>
                            <SelectContent>
                                {inspectors.map(i => (
                                    <SelectItem key={i.id} value={i.id}>{i.name || i.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Period Start</Label>
                            <Input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Period End</Label>
                            <Input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleCalculate}
                        disabled={!selectedInspectorId || !periodStart || !periodEnd || isCalculating}
                    >
                        {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!isCalculating && <Calculator className="mr-2 h-4 w-4" />}
                        Calculate Preview
                    </Button>
                </CardContent>
            </Card>
            {/* Step 2: Preview & Confirm */}
            {step === 2 && preview && (
                <Card className="border-primary">
                    <CardHeader>
                        <CardTitle>2. Payout Preview</CardTitle>
                        <CardDescription>Review the calculated payout before generating.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                                <div className="text-sm text-muted-foreground">Total Revenue</div>
                                <div className="text-2xl font-bold">{formatCurrency(preview.totalAmount)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Base Rate</div>
                                <div className="text-2xl font-bold">{formatCurrency(preview.baseRate)}</div>
                            </div>
                            <div className="col-span-2 border-t pt-2 mt-2">
                                <div className="text-sm text-muted-foreground">Total Payout</div>
                                <div className="text-3xl font-bold text-primary">
                                    {formatCurrency(preview.totalAmount + preview.baseRate)}
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-md">
                            <div className="bg-muted p-3 grid grid-cols-4 text-sm font-medium">
                                <div className="col-span-2">Job</div>
                                <div className="text-right">Job Total</div>
                                <div className="text-right">Payout (70%)</div>
                            </div>
                            <div className="divide-y max-h-60 overflow-y-auto">
                                {preview.jobs.map(job => (
                                    <div key={job.id} className="p-3 grid grid-cols-4 text-sm items-center">
                                        <div className="col-span-2">
                                            <div className="font-medium">{job.address}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {job.date ? new Date(job.date).toLocaleDateString() : 'No Date'}
                                            </div>
                                        </div>
                                        <div className="text-right text-muted-foreground">
                                            {formatCurrency(job.jobTotal)}
                                        </div>
                                        <div className="text-right font-medium">
                                            {formatCurrency(job.payoutAmount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(1)} className="w-full">
                                Back
                            </Button>
                            <Button
                                className="w-full"
                                onClick={handleCreate}
                                disabled={isSubmitting || preview.jobCount === 0}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {!isSubmitting && <CheckCircle className="mr-2 h-4 w-4" />}
                                Generate Statement
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
