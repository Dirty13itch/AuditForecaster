'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTemplatesForSelection } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { X, FileText } from 'lucide-react'

type TemplateSelectionModalProps = {
    jobId: string
    onClose: () => void
}

type Template = {
    id: string
    name: string
    description: string | null
}

export function TemplateSelectionModal({ jobId, onClose }: TemplateSelectionModalProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            const data = await getTemplatesForSelection()
            setTemplates(data)
        } catch (error) {
            console.error('Failed to load templates:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectTemplate = async (templateId: string) => {
        setCreating(true)
        try {
            const response = await fetch('/api/inspections/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ jobId, templateId }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create inspection')
            }

            const result = await response.json()
            onClose() // Close modal immediately on success
            router.push(`/dashboard/inspections/${jobId}`)
        } catch (error) {
            console.error('Failed to create inspection:', error)
            toast({
                title: "Error",
                description: "Failed to create inspection. Please try again.",
                variant: "destructive",
            })
            setCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Select Inspection Template</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading templates...
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">No templates found</p>
                            <Button onClick={() => router.push('/dashboard/reports/templates/new-advanced')}>
                                Create Your First Template
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelectTemplate(template.id)}
                                    disabled={creating}
                                    className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                                        <div className="flex-1">
                                            <div className="font-semibold">{template.name}</div>
                                            {template.description && (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {template.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {creating && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <p className="text-lg font-semibold">Creating inspection...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
