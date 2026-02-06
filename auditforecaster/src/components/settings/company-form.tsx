'use client'

import { updateCompanyInfo, updateNotificationPreferences } from "@/app/actions/company"
import type { CompanyInfo } from "@/app/actions/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useTransition, useState } from "react"

// ---------------------------------------------------------------------------
// Company Information Form
// ---------------------------------------------------------------------------

interface CompanyFormProps {
    companyInfo: CompanyInfo
}

export function CompanyForm({ companyInfo }: CompanyFormProps) {
    const [isPending, startTransition] = useTransition()

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await updateCompanyInfo(formData)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="companyName" className="text-white">Company Name</Label>
                <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={companyInfo.companyName}
                    placeholder="Your company name"
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address" className="text-white">Address</Label>
                <Input
                    id="address"
                    name="address"
                    defaultValue={companyInfo.address}
                    placeholder="123 Main St, City, State ZIP"
                    className="bg-black/20 border-white/10 text-white"
                    disabled={isPending}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-white">Phone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={companyInfo.phone}
                        placeholder="(555) 123-4567"
                        className="bg-black/20 border-white/10 text-white"
                        disabled={isPending}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="licenseNumber" className="text-white">License Number</Label>
                    <Input
                        id="licenseNumber"
                        name="licenseNumber"
                        defaultValue={companyInfo.licenseNumber}
                        placeholder="License / certification #"
                        className="bg-black/20 border-white/10 text-white"
                        disabled={isPending}
                    />
                </div>
            </div>

            <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isPending}
            >
                {isPending ? 'Saving...' : 'Save Company Info'}
            </Button>
        </form>
    )
}

// ---------------------------------------------------------------------------
// Notification Preferences Form
// ---------------------------------------------------------------------------

interface NotificationFormProps {
    companyInfo: CompanyInfo
}

export function NotificationForm({ companyInfo }: NotificationFormProps) {
    const [isPending, startTransition] = useTransition()
    const [emailNotif, setEmailNotif] = useState(companyInfo.emailNotifications)
    const [inAppNotif, setInAppNotif] = useState(companyInfo.inAppNotifications)

    async function handleSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await updateNotificationPreferences(formData)
            if (result.success) {
                toast.success(result.message)
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <input type="hidden" name="emailNotifications" value={String(emailNotif)} />
            <input type="hidden" name="inAppNotifications" value={String(inAppNotif)} />

            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-sm text-gray-400">
                        Receive email alerts for job updates, schedule changes, and reports.
                    </p>
                </div>
                <Switch
                    checked={emailNotif}
                    onCheckedChange={setEmailNotif}
                    disabled={isPending}
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-white">In-App Notifications</Label>
                    <p className="text-sm text-gray-400">
                        Show notification badges and alerts within the dashboard.
                    </p>
                </div>
                <Switch
                    checked={inAppNotif}
                    onCheckedChange={setInAppNotif}
                    disabled={isPending}
                />
            </div>

            <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isPending}
            >
                {isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
        </form>
    )
}
