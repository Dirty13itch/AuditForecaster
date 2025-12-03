'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getUninvoicedJobs, createInvoice } from "@/app/actions/invoices"

interface Builder {
    id: string
    name: string
}

interface Job {
    id: string
    address: string
    lotNumber: string
    subdivision?: { name: string } | null
    createdAt: Date
}

export function InvoiceWizard({ builders }: { builders: Builder[] }) {
    const [step, setStep] = useState(1)
    const [selectedBuilderId, setSelectedBuilderId] = useState<string>("")
    const [availableJobs, setAvailableJobs] = useState<Job[]>([])
    const [isLoadingJobs, setIsLoadingJobs] = useState(false)
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
    const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0] || new Date().toISOString())
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (selectedBuilderId) {
            setIsLoadingJobs(true)
            getUninvoicedJobs(selectedBuilderId)
                .then(jobs => {
                    setAvailableJobs(jobs)
                })
                .catch(err => {
                    toast.error("Failed to load jobs")
                    console.error(err)
                })
                .finally(() => setIsLoadingJobs(false))
        } else {
            setAvailableJobs([])
        }
    }, [selectedBuilderId])

    // Helper to toggle job selection
    const toggleJob = (jobId: string) => {
        setSelectedJobIds(prev =>
            prev.includes(jobId)
                ? prev.filter(id => id !== jobId)
                : [...prev, jobId]
        )
    }


    const handleCreate = async () => {
        if (!selectedBuilderId || selectedJobIds.length === 0) return

        setIsSubmitting(true)
        try {
            const result = await createInvoice({
                builderId: selectedBuilderId,
                jobIds: selectedJobIds,
                dueDate: new Date(dueDate)
            })

            if (result.success) {
                toast.success("Invoice created successfully")
                router.push(`/dashboard/finances/invoices/${result.invoiceId}`)
            }
        } catch (error) {
            toast.error("Failed to create invoice")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="grid gap-6">
            {/* Step 1: Select Builder */}
            <Card className={step === 1 ? 'border-primary' : ''}>
                <CardHeader>
                    <CardTitle>1. Select Builder</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedBuilderId}
                        onValueChange={(val) => {
                            setSelectedBuilderId(val)
                            setStep(2)
                            // Trigger fetch here (mocked for now)
                            // fetchJobs(val) 
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a builder..." />
                        </SelectTrigger>
                        <SelectContent>
                            {builders.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Step 2: Select Jobs */}
            {step >= 2 && (
                <Card className={step === 2 ? 'border-primary' : ''}>
                    <CardHeader>
                        <CardTitle>2. Select Jobs</CardTitle>
                        <CardDescription>Choose completed jobs to include in this invoice.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Jobs List */}
                        <div className="border rounded-md max-h-60 overflow-y-auto">
                            {isLoadingJobs ? (
                                <div className="p-4 text-center text-muted-foreground">Loading jobs...</div>
                            ) : availableJobs.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">No uninvoiced completed jobs found for this builder.</div>
                            ) : (
                                <div className="divide-y">
                                    {availableJobs.map(job => (
                                        <div key={job.id} className="flex items-center space-x-2 p-3 hover:bg-accent/50">
                                            <Checkbox
                                                id={job.id}
                                                checked={selectedJobIds.includes(job.id)}
                                                onCheckedChange={() => toggleJob(job.id)}
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor={job.id} className="cursor-pointer">
                                                    {job.address}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Lot: {job.lotNumber} • {job.subdivision?.name || 'No Subdivision'} • {new Date(job.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="duedate">Due Date</Label>
                                <Input
                                    type="date"
                                    id="duedate"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleCreate}
                            disabled={selectedJobIds.length === 0 || isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Invoice
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
