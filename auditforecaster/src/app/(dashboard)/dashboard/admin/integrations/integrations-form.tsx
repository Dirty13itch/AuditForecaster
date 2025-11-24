'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { enableCalendarSync, listGoogleCalendars } from '@/app/actions/google'
import { Loader2, RefreshCw } from 'lucide-react'

type Calendar = {
    id: string
    summary: string
}

type IntegrationsFormProps = {
    initialStatus: {
        googleCalendarId: string | null
        nextSyncToken: string | null
    } | null
}

export function IntegrationsForm({ initialStatus }: IntegrationsFormProps) {
    const [calendars, setCalendars] = useState<Calendar[]>([])
    const [selectedCalendar, setSelectedCalendar] = useState<string>(initialStatus?.googleCalendarId || '')
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(!!initialStatus?.googleCalendarId)

    const handleLoadCalendars = async () => {
        setLoading(true)
        try {
            const list = await listGoogleCalendars()
            setCalendars(list as Calendar[])
            toast.success('Calendars loaded')
        } catch (error) {
            toast.error('Failed to load calendars')
        } finally {
            setLoading(false)
        }
    }

    const handleEnableSync = async () => {
        if (!selectedCalendar) return

        setLoading(true)
        try {
            const result = await enableCalendarSync(selectedCalendar)
            if (result.success) {
                setSyncing(true)
                toast.success('Calendar sync enabled')
            } else {
                toast.error('Failed to enable sync')
            }
        } catch (error) {
            toast.error('Failed to enable sync')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Google Calendar Sync</h3>
                        <p className="text-sm text-gray-500">
                            Two-way sync with your Google Calendar. Jobs created here appear in Google, and events created in Google appear here.
                        </p>
                    </div>
                    {syncing && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Active
                        </span>
                    )}
                </div>

                <div className="space-y-4">
                    {!syncing ? (
                        <>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleLoadCalendars} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                                    Load Calendars
                                </Button>
                            </div>

                            {calendars.length > 0 && (
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <Label>Select Calendar</Label>
                                        <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a calendar..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {calendars.map((cal) => (
                                                    <SelectItem key={cal.id} value={cal.id}>
                                                        {cal.summary}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleEnableSync} disabled={!selectedCalendar || loading}>
                                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Enable Sync
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
                            <div className="flex-1">
                                <p className="font-medium">Syncing with: {initialStatus?.googleCalendarId}</p>
                                <p className="text-sm text-gray-500">Last sync token: {initialStatus?.nextSyncToken?.substring(0, 10)}...</p>
                            </div>
                            <Button variant="destructive" disabled>Disable Sync (Coming Soon)</Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="border rounded-lg p-6 space-y-4 opacity-50 cursor-not-allowed">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Google Photos Backup</h3>
                        <p className="text-sm text-gray-500">
                            Automatically create albums and upload inspection photos.
                        </p>
                    </div>
                    <Switch disabled />
                </div>
            </div>
        </div>
    )
}
