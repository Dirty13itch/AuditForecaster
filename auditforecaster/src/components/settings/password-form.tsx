'use client'

import { changePassword } from "@/app/actions/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useTransition, useRef } from "react"

export function PasswordForm() {
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await changePassword(formData)
            if (result.success) {
                toast.success(result.message)
                formRef.current?.reset()
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="currentPassword" className="text-white">Current Password</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="newPassword" className="text-white">New Password</Label>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={isPending}>
                {isPending ? 'Updating...' : 'Update Password'}
            </Button>
        </form>
    )
}
