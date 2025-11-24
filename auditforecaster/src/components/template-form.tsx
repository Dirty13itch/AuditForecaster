'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { createTemplate, updateTemplate } from "@/app/actions/templates"

export type ChecklistItem = {
    id: string
    label: string
    category: string
    required: boolean
}

type TemplateFormProps = {
    template?: {
        id: string
        name: string
        description: string | null
        checklistItems: ChecklistItem[]
        isDefault: boolean
    }
}

export function TemplateForm({ template }: TemplateFormProps) {
    const [name, setName] = useState(template?.name || '')
    const [description, setDescription] = useState(template?.description || '')
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
        template?.checklistItems || [
            { id: '1', label: 'Windows and doors properly sealed', category: 'Envelope', required: true },
            { id: '2', label: 'Attic hatch insulated and gasketed', category: 'Envelope', required: true },
            { id: '3', label: 'HVAC ducts sealed', category: 'HVAC', required: true },
        ]
    )
    const [isDefault, setIsDefault] = useState(template?.isDefault || false)

    const addItem = () => {
        setChecklistItems([
            ...checklistItems,
            { id: Date.now().toString(), label: '', category: 'General', required: true }
        ])
    }

    const removeItem = (id: string) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id))
    }

    const updateItem = (id: string, field: keyof ChecklistItem, value: string | boolean) => {
        setChecklistItems(checklistItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append('name', name)
        formData.append('description', description)
        formData.append('checklistItems', JSON.stringify(checklistItems))
        formData.append('isDefault', isDefault.toString())

        if (template) {
            await updateTemplate(template.id, formData)
        } else {
            await createTemplate(formData)
        }

        window.location.href = '/dashboard/reports/templates'
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Template Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Pre-Drywall Inspection"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Standard checklist for pre-drywall site visits"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <Label htmlFor="isDefault" className="cursor-pointer">Set as default template</Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Checklist Items</CardTitle>
                    <Button type="button" onClick={addItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {checklistItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                            <GripVertical className="h-5 w-5 text-gray-400 mt-2" />
                            <div className="flex-1 space-y-2">
                                <Input
                                    value={item.label}
                                    onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                                    placeholder="Inspection item description"
                                    required
                                />
                                <div className="flex gap-2">
                                    <Input
                                        value={item.category}
                                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                        placeholder="Category (e.g., Envelope)"
                                        className="flex-1"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={item.required}
                                            onChange={(e) => updateItem(item.id, 'required', e.target.checked)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm text-gray-600">Required</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit">
                    {template ? 'Update' : 'Create'} Template
                </Button>
            </div>
        </form>
    )
}
