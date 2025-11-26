'use client'

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { createJob } from "@/app/actions/jobs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Builder, User } from "@prisma/client"

export function CreateJobForm({ builders, inspectors }: { builders: Builder[], inspectors: User[] }) {
    const { toast } = useToast()
    const router = useRouter()
    const formRef = useRef<HTMLFormElement>(null)

    async function clientAction(formData: FormData) {
        const result = await createJob(formData)

        if (result.success) {
            toast({
                title: "Job Scheduled",
                description: result.message,
                variant: "success", // Note: verify if 'success' variant exists in your toast component, otherwise use default or check implementation
            })
            formRef.current?.reset()
            router.refresh()
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            })
        }
    }

    return (
        <form ref={formRef} action={clientAction} className="space-y-4">
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
