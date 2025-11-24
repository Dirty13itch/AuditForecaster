'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PhotoUpload, Photo } from "@/components/photo-upload"
import { ChecklistSection } from "@/components/checklist-section"
import { SignaturePad } from "@/components/signature-pad"
import { updateInspection } from "@/app/actions/inspections"
import { useToast } from "@/components/ui/use-toast"
import { useOfflineSync } from "@/hooks/use-offline-sync"
import { Wifi, WifiOff, Save } from "lucide-react"
import { ChecklistItem } from "@/lib/offline-storage"

// Submit button with loading state
function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {pending ? 'Saving...' : 'Complete Inspection'}
        </Button>
    )
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
    { id: 'ext-1', label: 'Exterior Penetrations Sealed', status: null, note: '' },
    { id: 'ext-2', label: 'Windows & Doors Weatherstripped', status: null, note: '' },
    { id: 'int-1', label: 'Attic Hatch Insulated & Sealed', status: null, note: '' },
    { id: 'int-2', label: 'Recessed Lights Sealed (IC-Rated)', status: null, note: '' },
    { id: 'hvac-1', label: 'Ducts Sealed (Mastic/Tape)', status: null, note: '' },
    { id: 'hvac-2', label: 'Filter Slot Covered', status: null, note: '' },
]

type InspectionFormProps = {
    jobId: string
    inspectionId?: string // Optional because inspection might not exist yet
    initialData?: {
        checklist?: ChecklistItem[]
        signatureUrl?: string
        cfm50?: number
        houseVolume?: number
        ach50?: number
        notes?: string
        photos?: Photo[]
    }
    templates?: Array<{
        id: string
        name: string
        checklistItems: { label: string }[]
    }>
}

type InspectionData = {
    checklist?: ChecklistItem[]
    signatureUrl?: string
    cfm50?: number
    houseVolume?: number
    ach50?: number
    notes?: string
    photos?: Photo[]
}

export function InspectionForm({ jobId, inspectionId, initialData, templates = [] }: InspectionFormProps) {
    const { toast } = useToast()
    const [checklist, setChecklist] = useState<ChecklistItem[]>(initialData?.checklist || DEFAULT_CHECKLIST)
    const [signature, setSignature] = useState<string | null>(initialData?.signatureUrl || null)
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
    const [isDraft, setIsDraft] = useState<boolean>(false)

    const { isOffline, lastSaved, offlineData, saveDraft } = useOfflineSync<InspectionData>(jobId)

    // Load offline data when available
    useEffect(() => {
        if (offlineData) {
            if (offlineData.checklist) setChecklist(offlineData.checklist as ChecklistItem[])
            if (offlineData.signatureUrl) setSignature(offlineData.signatureUrl as string)
        }
    }, [offlineData])

    const loadTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId)
        if (template) {
            const newChecklist = template.checklistItems.map((item, index) => ({
                id: `${Date.now()}-${index}`,
                label: item.label,
                status: null,
                note: ''
            }))
            setChecklist(newChecklist as ChecklistItem[])
        }
    }

    // Auto‑save on any form change
    const handleFormChange = (e: React.FormEvent<HTMLFormElement>) => {
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries())
        saveDraft({ ...data, checklist, signatureUrl: signature || undefined })
    }

    // Save when checklist or signature changes
    useEffect(() => {
        saveDraft({ checklist, signatureUrl: signature || undefined })
    }, [checklist, signature, saveDraft])

    async function clientAction(formData: FormData) {
        formData.set('checklist', JSON.stringify(checklist))
        if (signature) {
            formData.set('signature', signature)
        }
        formData.set('isDraft', String(isDraft))

        if (isDraft) {
            // Save locally as draft only
            saveDraft({ ...Object.fromEntries(formData.entries()), checklist, signatureUrl: signature || undefined })
            toast({ title: 'Draft Saved', description: 'Your inspection draft has been saved locally.', variant: 'default' })
            setIsDraft(false)
            return
        }

        // Validate checklist for final submission
        const failedItems = checklist.filter(i => i.status === 'FAIL' && !i.note)
        if (failedItems.length > 0) {
            toast({ title: 'Validation Error', description: 'Please provide reasons for all failed checklist items.', variant: 'destructive' })
            return
        }

        try {
            await updateInspection(formData)
            toast({ title: 'Inspection Saved', description: 'The inspection data has been successfully saved.', variant: 'success' })
        } catch {
            toast({ title: 'Save Failed', description: 'Could not save to server. Data is saved locally.', variant: 'destructive' })
        }
    }

    return (
        <form action={clientAction} onChange={handleFormChange} className="space-y-8 pb-20 md:pb-0">
            <input type="hidden" name="jobId" value={jobId} />

            {/* Offline Status Indicator */}
            <div className="flex items-center justify-end space-x-2 text-sm">
                {isOffline ? (
                    <span className="flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <WifiOff className="w-3 h-3 mr-1" /> Offline Mode
                    </span>
                ) : (
                    <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded">
                        <Wifi className="w-3 h-3 mr-1" /> Online
                    </span>
                )}
                {lastSaved && (
                    <span className="text-gray-400 text-xs">Last saved: {lastSaved.toLocaleTimeString()}</span>
                )}
            </div>

            {/* Template Selector */}
            {
                checklist.length === 0 && templates.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Template</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Label htmlFor="template">Choose an inspection template</Label>
                            <select
                                id="template"
                                value={selectedTemplateId}
                                onChange={e => { setSelectedTemplateId(e.target.value); loadTemplate(e.target.value) }}
                                className="w-full mt-2 px-3 py-2 border rounded-md"
                            >
                                <option value="">-- Select Template --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </CardContent>
                    </Card>
                )
            }

            {/* Main form fields */}
            <Card>
                <CardHeader>
                    <CardTitle>Blower Door Test Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cfm50">CFM @ 50Pa</Label>
                            <Input id="cfm50" name="cfm50" type="number" placeholder="e.g. 1200" defaultValue={initialData?.cfm50} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ach50">ACH50</Label>
                            <Input id="ach50" name="ach50" type="number" step="0.01" placeholder="Calculated automatically" readOnly className="bg-gray-50" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Field Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Enter any observations or issues found..."
                            className="min-h-[100px]"
                            defaultValue={initialData?.notes}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChecklistSection items={checklist} onChange={setChecklist} />
                </CardContent>
            </Card>

            {/* Photos */}
            <Card>
                <CardHeader>
                    <CardTitle>Photos</CardTitle>
                </CardHeader>
                <CardContent>
                    {inspectionId ? (
                        <PhotoUpload inspectionId={inspectionId} existingPhotos={initialData?.photos || []} />
                    ) : (
                        <p className="text-sm text-gray-500">Photos will be available after first save</p>
                    )}
                </CardContent>
            </Card>

            {/* Signature */}
            <Card>
                <CardHeader>
                    <CardTitle>Inspector Sign-Off</CardTitle>
                </CardHeader>
                <CardContent>
                    <SignaturePad value={signature} onChange={setSignature} />
                    <input type="hidden" name="signature" value={signature || ''} />
                </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t md:static md:bg-transparent md:border-0 md:p-0 flex justify-end gap-4 z-10">
                <Button variant="outline" type="button" onClick={() => window.history.back()} className="hidden md:inline-flex">
                    Cancel
                </Button>
                <Button type="button" onClick={() => setIsDraft(true)} className="w-full md:w-auto">
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                </Button>
                <SubmitButton />
            </div>
            <div className="h-16 md:hidden" />
        </form >
    )
}
