'use client'

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { XCircle } from "lucide-react"
import { rejectJob } from "@/app/actions/qa"
import { useState } from "react"

export function RejectJobDialog({ jobId }: { jobId: string }) {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="lg">
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject & Return
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reject Inspection</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting this inspection. The inspector will be notified to make corrections.
                    </DialogDescription>
                </DialogHeader>
                <form action={async (formData) => {
                    await rejectJob(formData)
                    setOpen(false)
                }}>
                    <input type="hidden" name="jobId" value={jobId} />
                    <div className="grid gap-4 py-4">
                        <Textarea
                            name="reason"
                            placeholder="e.g., Photos are blurry, CFM value seems too low..."
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" variant="destructive">Confirm Rejection</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
