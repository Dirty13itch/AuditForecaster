'use client'

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { exportJobsCSV, exportInvoicesCSV, exportExpensesCSV } from "@/app/actions/export"
import { useState } from "react"
import { toast } from "sonner"

interface ExportButtonProps {
    type: 'JOBS' | 'INVOICES' | 'EXPENSES'
    label?: string
}

export function ExportButton({ type, label = "Export CSV" }: ExportButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleExport = async () => {
        setIsLoading(true)
        try {
            const exportFn = type === 'JOBS' ? exportJobsCSV
                : type === 'INVOICES' ? exportInvoicesCSV
                : exportExpensesCSV

            const result = await exportFn()

            if (!result.success) {
                toast.error(result.message)
                return
            }

            // Create blob and download
            const blob = new Blob([result.csv], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success("Export downloaded")
        } catch {
            toast.error("Failed to export data")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {label}
        </Button>
    )
}
