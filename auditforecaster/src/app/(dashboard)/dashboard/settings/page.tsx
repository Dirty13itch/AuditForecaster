import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { auth } from "@/auth"
import { ProfileForm } from "@/components/profile-form"

export default async function SettingsPage() {
    const session = await auth()

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                            This is how others will see you on the site.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm
                            name={session?.user?.name || ''}
                            email={session?.user?.email || ''}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                        <CardDescription>
                            Configure how you receive notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="email-notifs" className="flex flex-col space-y-1">
                                <span>Email Notifications</span>
                                <span className="font-normal text-xs text-muted-foreground">Receive emails about new job assignments.</span>
                            </Label>
                            <Switch id="email-notifs" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="marketing" className="flex flex-col space-y-1">
                                <span>Marketing Emails</span>
                                <span className="font-normal text-xs text-muted-foreground">Receive emails about new features and updates.</span>
                            </Label>
                            <Switch id="marketing" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pricing Configuration</CardTitle>
                        <CardDescription>
                            Manage service items, base prices, and price lists.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <a href="/dashboard/settings/pricing">Manage Pricing</a>
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    {/* Save button moved to forms */}
                </div>
            </div>
        </div>
    )
}
