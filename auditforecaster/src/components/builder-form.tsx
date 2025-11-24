'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBuilder, updateBuilder } from "@/app/actions/builders"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type Builder = {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
}

interface BuilderFormProps {
    builder?: Builder
    onSuccess: () => void
}

export function BuilderForm({ builder, onSuccess }: BuilderFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            const result = builder
                ? await updateBuilder(builder.id, null, formData)
                : await createBuilder(formData)

            toast({
                title: result.message,
                variant: result.message.includes('Failed') ? 'destructive' : 'default'
            })

            if (!result.message.includes('Failed')) {
                onSuccess()
                router.refresh()
            }
        } catch {
            toast({
                title: "An error occurred",
                description: "Please try again later",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" name="name" defaultValue={builder?.name} required placeholder="Acme Construction" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={builder?.email || ''} placeholder="contact@acme.com" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={builder?.phone || ''} placeholder="(555) 123-4567" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={builder?.address || ''} placeholder="123 Main St" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (builder ? "Update Builder" : "Add Builder")}
                </Button>
            </div>
        </form>
    )
}
