'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createServiceItem, updateServiceItem } from "@/app/actions/pricing"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface ServiceItemFormProps {
    item?: {
        id: string
        name: string
        description: string | null
        basePrice: number
    }
    trigger?: React.ReactNode
}

export function ServiceItemForm({ item, trigger }: ServiceItemFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const data = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            basePrice: parseFloat(formData.get('basePrice') as string)
        }

        try {
            if (item) {
                await updateServiceItem(item.id, data)
                toast.success('Service item updated')
            } else {
                await createServiceItem(data)
                toast.success('Service item created')
            }
            setOpen(false)
        } catch {
            toast.error('Failed to save service item')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Service
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{item ? 'Edit Service Item' : 'New Service Item'}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={item?.name} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={item?.description || ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="basePrice">Base Price ($)</Label>
                        <Input
                            id="basePrice"
                            name="basePrice"
                            type="number"
                            step="0.01"
                            defaultValue={item?.basePrice}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
