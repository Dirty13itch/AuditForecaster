'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createSubdivision, updateSubdivision } from "@/app/actions/subdivisions"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface SubdivisionFormProps {
    builderId: string
    subdivision?: {
        id: string
        name: string
    }
    trigger?: React.ReactNode
}

export function SubdivisionForm({ builderId, subdivision, trigger }: SubdivisionFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const name = formData.get('name') as string

        try {
            if (subdivision) {
                await updateSubdivision(subdivision.id, { name })
                toast.success('Subdivision updated')
            } else {
                await createSubdivision({ name, builderId })
                toast.success('Subdivision created')
            }
            setOpen(false)
        } catch {
            toast.error('Failed to save subdivision')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Subdivision
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{subdivision ? 'Edit Subdivision' : 'New Subdivision'}</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={subdivision?.name} required />
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
