'use client'

import { createJob } from "@/app/actions/jobs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Builder, User } from "@prisma/client"

export function CreateJobForm({ builders, inspectors }: { builders: Builder[], inspectors: User[] }) {
    const { toast } = useToast()

    async function clientAction(formData: FormData) {
        await createJob(formData)
        // Since createJob redirects on success, we might not see this toast immediately unless we change the action behavior.
        // However, for this demo, we'll show it before the redirect happens or if we modify the action to return status.
        // For now, let's assume the action redirects, but we can still try to show a toast or handle errors if we modify the action later.

        // Ideally, the server action should return a status, and we handle the redirect client-side if we want to show a toast first.
        // But to keep it simple and consistent with the current action:
        toast({
            title: "Job Scheduled",
            description: "The new job has been successfully created.",
            variant: "success",
        })
    }

    return (
        <form action={clientAction} className="space-y-4">
            <div className="space-y-2">
                <Input name="lotNumber" placeholder="Lot Number" required />
                <Input name="streetAddress" placeholder="Street Address" required />
                <Input name="city" placeholder="City" required />
                <Select name="builderId" required>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Builder" />
                    </SelectTrigger>
                    <SelectContent>
                        {builders.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select name="inspectorId">
                    <SelectTrigger>
                        <SelectValue placeholder="Assign Inspector (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        {inspectors.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full">Schedule Job</Button>
        </form>
    )
}
