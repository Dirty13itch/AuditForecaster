'use client'

import { updateProfile } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTransition } from "react"

interface ProfileFormProps {
    user: {
        name: string | null
        email: string
        phone?: string | null
    }
}

export function ProfileForm({ user }: ProfileFormProps) {
    const [isPending, startTransition] = useTransition()

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await updateProfile(formData)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                    id="name"
                    name="name"
                    defaultValue={user.name || ''}
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                    id="email"
                    name="email"
                    defaultValue={user.email}
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
        </form>
    )
}
