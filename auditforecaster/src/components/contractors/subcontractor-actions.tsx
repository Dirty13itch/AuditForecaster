'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import { SubcontractorDialog } from "./subcontractor-dialog"
import { deleteSubcontractor } from "@/app/actions/contractors"
import { useToast } from "@/components/ui/use-toast"
import { SubcontractorInput } from "@/lib/schemas"

interface SubcontractorActionsProps {
    subcontractor: SubcontractorInput & { id: string }
}

export function SubcontractorActions({ subcontractor }: SubcontractorActionsProps) {
    const { toast } = useToast()
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this subcontractor?")) return

        setIsDeleting(true)
        try {
            const result = await deleteSubcontractor(subcontractor.id)
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                })
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete subcontractor.",
            })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <SubcontractorDialog
                mode="edit"
                subcontractor={subcontractor}
                trigger={
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                }
            />
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                <Trash className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    )
}
