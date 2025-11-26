'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { generateDailyRoute } from "@/app/actions/routes"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export function RouteGenerator() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    // Ideally we'd select a driver, but for MVP let's just use current user or hardcode for demo
    // We need a way to select driver. Let's just assume we are generating for ourselves for now 
    // or add a selector if we had the list. 
    // Since this is a client component, we'd need to pass drivers in. 
    // For simplicity, let's just trigger for "Current User" (Inspector view) or handle logic on server.
    // Actually, `generateDailyRoute` takes `driverId`.
    // Let's make this simple: "Generate My Route" for now.

    const router = useRouter()

    const handleGenerate = async () => {
        setIsLoading(true)
        try {
            // We need the current user ID. 
            // In a real app we'd use a session hook.
            // For now, let's assume the server action handles "me" if we don't pass ID? 
            // No, the server action expects driverId.
            // Let's fetch the session in the component? No, client component.
            // Let's just pass a placeholder or update the server action to use "me" if null.
            // I'll update the server action to default to current user if driverId is missing.

            // Wait, I can't easily update the server action from here without a new tool call.
            // Let's assume the user is an admin generating for someone else?
            // Or just use a hardcoded ID for the demo if I can't get the list?
            // Better: I'll update the server action to accept `driverId` as optional and default to `session.user.id`.

            // Actually, I'll just use a server component wrapper to pass the user ID? 
            // Too complex for this step.
            // Let's just use a "Generate for Me" button that calls an action wrapper.

            // I'll use a hidden input for now or just let the server action fail if I don't pass it.
            // Wait, I can use `useSession` from `next-auth/react` but I need to set up the provider.
            // Let's just try to call it and see. I'll update the server action in the next step to be more flexible.

            // Actually, I will update the server action right now in my thought process to handle "me".
            // But I already wrote the file.
            // I'll just pass a dummy ID and fix it in the next step.
            // Or better, I'll create a `generateMyRoute` action wrapper.

            const result = await generateDailyRoute("CURRENT_USER", new Date(date)) // I'll handle this magic string in the server action fix

            if (result.success) {
                toast.success("Route generated successfully")
                setIsOpen(false)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error("Failed to generate route")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Sparkles className="mr-2 h-4 w-4" /> Generate Route
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Daily Route</DialogTitle>
                    <DialogDescription>
                        Automatically optimize the route for the selected date.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
