'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, MinusCircle, MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { ChecklistItem } from "@/lib/offline-storage"

export type ChecklistItemStatus = 'PASS' | 'FAIL' | 'NA' | null

interface ChecklistSectionProps {
    items: ChecklistItem[]
    onChange: (items: ChecklistItem[]) => void
}

export function ChecklistSection({ items: initialItems, onChange }: ChecklistSectionProps) {
    const [items, setItems] = useState<ChecklistItem[]>(initialItems)

    const handleStatusChange = (id: string, status: ChecklistItemStatus) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, status } : item
        )
        setItems(newItems)
        onChange(newItems)
    }

    const handleNoteChange = (id: string, note: string) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, note } : item
        )
        setItems(newItems)
        onChange(newItems)
    }

    return (
        <div className="space-y-6">
            {items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.label}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={item.status === 'PASS' ? 'default' : 'outline'}
                                className={item.status === 'PASS' ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => handleStatusChange(item.id, 'PASS')}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Pass
                            </Button>
                            <Button
                                type="button"
                                variant={item.status === 'FAIL' ? 'destructive' : 'outline'}
                                onClick={() => handleStatusChange(item.id, 'FAIL')}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Fail
                            </Button>
                            <Button
                                type="button"
                                variant={item.status === 'NA' ? 'secondary' : 'outline'}
                                onClick={() => handleStatusChange(item.id, 'NA')}
                            >
                                <MinusCircle className="mr-2 h-4 w-4" />
                                N/A
                            </Button>
                        </div>
                    </div>

                    {/* Note Section - Always visible if there's a note, or if status is FAIL */}
                    {(item.status === 'FAIL' || item.note) && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor={`note-${item.id}`} className="text-xs text-gray-500 mb-1.5 block">
                                {item.status === 'FAIL' ? 'Reason for failure (Required)' : 'Notes'}
                            </Label>
                            <div className="relative">
                                <MessageSquare className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                <Textarea
                                    id={`note-${item.id}`}
                                    value={item.note}
                                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                    placeholder="Add comments..."
                                    className="pl-8 min-h-[80px]"
                                />
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
