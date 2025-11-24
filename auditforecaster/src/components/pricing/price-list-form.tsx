'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createPriceList } from "@/app/actions/pricing"
import { toast } from "sonner"
import { Plus } from "lucide-react"

export function PriceListForm() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const data = {
            name: formData.get('name') as string,
            // builderId and subdivisionId would be selected here in a real app
        }

        try {
            await createPriceList(data)
            toast.success('Price list created')
            setOpen(false)
        } catch {
            toast.error('Failed to create price list')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Price List
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Price List</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="e.g. 2024 Standard Pricing" required />
                    </div>
                    {/* Builder/Subdivision Selectors would go here */}
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Price List'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    )
}
