'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createActionItem } from '@/app/actions/action-items'

interface ActionItemDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    inspectionId: string
    failedItemTitle?: string
    onSuccess?: () => void
}

export function ActionItemDialog({ open, onOpenChange, inspectionId, failedItemTitle, onSuccess }: ActionItemDialogProps) {
    const [title, setTitle] = useState(failedItemTitle || '')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('MEDIUM')
    const [assignedToEmail, setAssignedToEmail] = useState('')
    const [loading, setLoading] = useState(false)

    // Reset title when failedItemTitle changes
    React.useEffect(() => {
        if (failedItemTitle) setTitle(failedItemTitle)
    }, [failedItemTitle])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            const result = await createActionItem({ 
                inspectionId, 
                title, 
                description, 
                priority,
                assignedToEmail: assignedToEmail || undefined
            })
            
            if (result.success) {
                toast.success('Action Item Created')
                onOpenChange(false)
                setTitle('')
                setDescription('')
                setAssignedToEmail('')
                setPriority('MEDIUM')
                onSuccess?.()
            } else {
                toast.error(result.error || 'Failed to create action item')
            }
        } catch (error) {
            toast.error('Failed to create action item')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Action Item</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="e.g., Fix broken window seal"
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            placeholder="Details about the issue..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Assign To (Email)</Label>
                        <Input 
                            type="email"
                            value={assignedToEmail} 
                            onChange={e => setAssignedToEmail(e.target.value)} 
                            placeholder="builder@example.com"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Action Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
