'use client'

import { Button } from "@/components/ui/button"
import { Trash } from "lucide-react"
import { deleteReport } from "@/app/actions/reports"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function DeleteReportButton({ id }: { id: string }) {
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this report?")) return

        try {
            await deleteReport(id)
            toast.success("Report deleted")
            router.refresh()
        } catch {
            toast.error("Failed to delete report")
        }
    }

    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash className="h-4 w-4" />
        </Button>
    )
}
