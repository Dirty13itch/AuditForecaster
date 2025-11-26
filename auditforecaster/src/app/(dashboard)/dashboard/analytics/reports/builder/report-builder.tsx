'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Save, Play } from "lucide-react"
import { saveReport } from "@/app/actions/reports"
import { useRouter } from "next/navigation"

// Define available data sources and columns
const DATA_SOURCES = {
    JOBS: {
        label: 'Jobs',
        columns: [
            { id: 'lotNumber', label: 'Lot Number' },
            { id: 'address', label: 'Address' },
            { id: 'status', label: 'Status' },
            { id: 'scheduledDate', label: 'Scheduled Date' },
            { id: 'completedAt', label: 'Completed Date' },
            { id: 'builder', label: 'Builder' },
            { id: 'subdivision', label: 'Subdivision' },
            { id: 'inspector', label: 'Inspector' },
            { id: 'payoutAmount', label: 'Payout Amount' }
        ]
    },
    INVOICES: {
        label: 'Invoices',
        columns: [
            { id: 'invoiceNumber', label: 'Invoice #' },
            { id: 'date', label: 'Date' },
            { id: 'status', label: 'Status' },
            { id: 'totalAmount', label: 'Total Amount' },
            { id: 'builder', label: 'Builder' }
        ]
    }
}

export function ReportBuilder() {
    const [source, setSource] = useState<'JOBS' | 'INVOICES'>('JOBS')
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [reportName, setReportName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleColumnToggle = (columnId: string) => {
        setSelectedColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(c => c !== columnId)
                : [...prev, columnId]
        )
    }

    const handleSave = async () => {
        if (!reportName) {
            toast.error("Please enter a report name")
            return
        }
        if (selectedColumns.length === 0) {
            toast.error("Please select at least one column")
            return
        }

        setIsLoading(true)
        try {
            const result = await saveReport({
                name: reportName,
                config: {
                    source,
                    columns: selectedColumns
                }
            })

            if (result.success) {
                toast.success("Report saved successfully")
                router.push('/dashboard/analytics/reports')
            }
        } catch {
            toast.error("Failed to save report")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRun = async () => {
        if (selectedColumns.length === 0) {
            toast.error("Please select at least one column")
            return
        }
        toast.info("Running report... (Preview not implemented yet)")
    }

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select value={source} onValueChange={(v: string) => { setSource(v as 'JOBS' | 'INVOICES'); setSelectedColumns([]) }}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="JOBS">Jobs</SelectItem>
                                <SelectItem value="INVOICES">Invoices</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Columns</Label>
                        <div className="grid gap-2 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                            {DATA_SOURCES[source].columns.map(col => (
                                <div key={col.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={col.id}
                                        checked={selectedColumns.includes(col.id)}
                                        onCheckedChange={() => handleColumnToggle(col.id)}
                                    />
                                    <Label htmlFor={col.id} className="cursor-pointer">{col.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Report Name</Label>
                        <Input
                            placeholder="e.g., Monthly Completed Jobs"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleRun} variant="outline">
                            <Play className="mr-2 h-4 w-4" /> Run
                        </Button>
                        <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground border-dashed border-2 rounded-lg m-4">
                    Select columns and click Run to see data.
                </CardContent>
            </Card>
        </div>
    )
}
