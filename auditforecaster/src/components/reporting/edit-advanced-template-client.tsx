'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateBuilder } from '@/components/reporting/template-builder/builder'
import { saveAdvancedTemplate } from '@/app/actions/advanced-templates'
import { TemplateStructure } from '@/lib/reporting/engine'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type EditAdvancedTemplateClientProps = {
    template: {
        id: string
        name: string
        description: string | null
        structure: TemplateStructure
    }
}

export function EditAdvancedTemplateClient({ template }: EditAdvancedTemplateClientProps) {
    const router = useRouter()
    const [name, setName] = useState(template.name)
    const [description, setDescription] = useState(template.description || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async (structure: TemplateStructure) => {
        if (!name.trim()) {
            alert('Please enter a template name')
            return
        }

        setIsSaving(true)
        try {
            await saveAdvancedTemplate({
                name,
                description,
                structure,
                templateId: template.id
            })
            router.push('/dashboard/reports/templates')
        } catch (error) {
            console.error('Failed to save template:', error)
            alert('Failed to save template')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Edit Advanced Template</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Modify template structure, logic, and settings
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Template Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <TemplateBuilder
                onSave={handleSave}
                initialStructure={template.structure as TemplateStructure || { pages: [], logic: [] }}
            />

            {isSaving && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <p className="text-lg font-semibold">Saving template...</p>
                    </div>
                </div>
            )}
        </div>
    )
}
