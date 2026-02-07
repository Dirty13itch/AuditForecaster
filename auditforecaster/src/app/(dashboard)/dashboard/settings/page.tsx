import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User as UserIcon, Calendar, Lock } from "lucide-react"
import { ProfileForm } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Settings",
    description: "Manage your profile and integrations.",
}

export default async function SettingsPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) return null

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your profile and integrations</p>
            </div>

            {/* Profile */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Profile
                    </CardTitle>
                    <CardDescription>Update your name and contact information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileForm user={user} />
                </CardContent>
            </Card>

            {/* Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                    </CardTitle>
                    <CardDescription>Change your account password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PasswordForm />
                </CardContent>
            </Card>

            {/* Google Calendar Integration */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Google Calendar
                        <Badge variant="outline" className="ml-2">Coming Soon</Badge>
                    </CardTitle>
                    <CardDescription>
                        Connect your Building Knowledge shared calendar to automatically sync job schedules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="font-medium">Google Calendar sync will be available soon.</p>
                        <p className="mt-1">This will automatically pull jobs from the Building Knowledge calendar into your schedule.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
