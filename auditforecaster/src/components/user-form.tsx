'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createUser, updateUser } from "@/app/actions/users"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type User = {
    id: string
    name: string | null
    email: string
    role: string
}

interface UserFormProps {
    user?: User
    onSuccess: () => void
    defaultRole?: string
}

export function UserForm({ user, onSuccess, defaultRole }: UserFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)

        const formData = new FormData(event.currentTarget)

        try {
            const result = user
                ? await updateUser(user.id, null, formData)
                : await createUser(null, formData)

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
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" defaultValue={user?.name || ''} required placeholder="John Doe" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" defaultValue={user?.email} required placeholder="john@example.com" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={user?.role || defaultRole || "INSPECTOR"}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="INSPECTOR">Inspector</SelectItem>
                        <SelectItem value="QA">QA Reviewer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">{user ? "New Password (Optional)" : "Password"}</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    required={!user}
                    placeholder={user ? "Leave blank to keep current" : "Enter password"}
                />
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (user ? "Update User" : "Create User")}
                </Button>
            </div>
        </form>
    )
}
