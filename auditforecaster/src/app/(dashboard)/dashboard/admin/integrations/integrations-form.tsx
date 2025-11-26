'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { enableCalendarSync, listGoogleCalendars } from '@/app/actions/google'
import { getIntegrationSettings, updateIntegrationSettings, type IntegrationSettingsData } from '@/app/actions/integrations'
import { Loader2, RefreshCw, Save } from 'lucide-react'

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
    // Google Calendar State
    const [calendars, setCalendars] = useState<Calendar[]>([])
    const [selectedCalendar, setSelectedCalendar] = useState<string>(initialStatus?.googleCalendarId || '')
    const [loadingCalendar, setLoadingCalendar] = useState(false)
    const [syncingCalendar, setSyncingCalendar] = useState(!!initialStatus?.googleCalendarId)

    // Integration Settings State
    const [settings, setSettings] = useState<IntegrationSettingsData>({})
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [savingSettings, setSavingSettings] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const result = await getIntegrationSettings()
            if (result.success && result.data) {
                setSettings(result.data)
            }
        } catch {
            toast.error('Failed to load integration settings')
        } finally {
            setLoadingSettings(false)
        }
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        try {
            const result = await updateIntegrationSettings(settings)
            if (result.success) {
                toast.success('Settings saved successfully')
            } else {
                toast.error('Failed to save settings')
            }
        } catch {
            toast.error('Failed to save settings')
        } finally {
            setSavingSettings(false)
        }
    }

    const handleLoadCalendars = async () => {
        setLoadingCalendar(true)
        try {
            const list = await listGoogleCalendars()
            setCalendars(list as Calendar[])
            toast.success('Calendars loaded')
        } catch {
            toast.error('Failed to load calendars')
        } finally {
            setLoadingCalendar(false)
        }
    }

    const handleEnableSync = async () => {
        if (!selectedCalendar) return

        setLoadingCalendar(true)
        try {
            const result = await enableCalendarSync(selectedCalendar)
            if (result.success) {
                setSyncingCalendar(true)
                toast.success('Calendar sync enabled')
            } else {
                toast.error('Failed to enable sync')
            }
        } catch {
            toast.error('Failed to enable sync')
        } finally {
            setLoadingCalendar(false)
        }
    }

    if (loadingSettings) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
    }

    return (
        <div className="space-y-6">
            {/* Google Calendar Section */}
            <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Google Calendar Sync</h3>
                        <p className="text-sm text-gray-500">
                            Two-way sync with your Google Calendar. Jobs created here appear in Google, and events created in Google appear here.
                        </p>
                    </div>
                    {syncingCalendar && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Active
                        </span>
                    )}
                </div>

                <div className="space-y-4">
                    {!syncingCalendar ? (
                        <>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleLoadCalendars} disabled={loadingCalendar}>
                                    {loadingCalendar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
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
                                    <Button onClick={handleEnableSync} disabled={!selectedCalendar || loadingCalendar}>
                                        {loadingCalendar && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
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

            {/* SupplyPro Section */}
            <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">SupplyPro Integration</h3>
                        <p className="text-sm text-gray-500">
                            Automatically create jobs when builders schedule them in BuildPro/SupplyPro.
                        </p>
                    </div>
                    <Switch
                        checked={settings.supplyProEnabled}
                        onCheckedChange={(checked) => setSettings({ ...settings, supplyProEnabled: checked })}
                    />
                </div>

                {settings.supplyProEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="grid gap-2">
                            <Label htmlFor="supplyProApiKey">SupplyPro API Key</Label>
                            <Input
                                id="supplyProApiKey"
                                type="password"
                                value={settings.supplyProApiKey || ''}
                                onChange={(e) => setSettings({ ...settings, supplyProApiKey: e.target.value })}
                                placeholder="Enter your SupplyPro Connect API Key"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto-Create Jobs</Label>
                                <p className="text-sm text-gray-500">Automatically create jobs from incoming webhooks</p>
                            </div>
                            <Switch
                                checked={settings.autoCreateJobsFromBuildPro}
                                onCheckedChange={(checked) => setSettings({ ...settings, autoCreateJobsFromBuildPro: checked })}
                            />
                        </div>
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
                            <p className="font-medium">Webhook URL:</p>
                            <code className="bg-slate-200 px-1 py-0.5 rounded text-xs select-all">
                                {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/supplypro` : '/api/webhooks/supplypro'}
                            </code>
                        </div>
                    </div>
                )}
            </div>

            {/* Ekotrope Section */}
            <div className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium">Ekotrope Integration</h3>
                        <p className="text-sm text-gray-500">
                            Sync inspection data to Ekotrope and auto-generate HERS certificates.
                        </p>
                    </div>
                    <Switch
                        checked={settings.ekotropeEnabled}
                        onCheckedChange={(checked) => setSettings({ ...settings, ekotropeEnabled: checked })}
                    />
                </div>

                {settings.ekotropeEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="grid gap-2">
                            <Label htmlFor="ekotropeApiKey">Ekotrope API Key</Label>
                            <Input
                                id="ekotropeApiKey"
                                type="password"
                                value={settings.ekotropeApiKey || ''}
                                onChange={(e) => setSettings({ ...settings, ekotropeApiKey: e.target.value })}
                                placeholder="Enter your Ekotrope API Key"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto-Sync Inspection Data</Label>
                                <p className="text-sm text-gray-500">Upload data when inspection is completed</p>
                            </div>
                            <Switch
                                checked={settings.autoSyncToEkotrope}
                                onCheckedChange={(checked) => setSettings({ ...settings, autoSyncToEkotrope: checked })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Auto-Generate HERS Certs</Label>
                                <p className="text-sm text-gray-500">Retrieve and attach certificates automatically</p>
                            </div>
                            <Switch
                                checked={settings.autoGenerateHERSCerts}
                                onCheckedChange={(checked) => setSettings({ ...settings, autoGenerateHERSCerts: checked })}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full md:w-auto">
                    {savingSettings && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <Save className="h-4 w-4 mr-2" />
                    Save Integration Settings
                </Button>
            </div>
        </div>
    )
}
