import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCompanyInfo } from "@/app/actions/company"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User as UserIcon, Lock, Shield, Building2, Bell, ShieldCheck } from "lucide-react"
import { ProfileForm } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"
import { CompanyForm, NotificationForm } from "@/components/settings/company-form"

export default async function SettingsPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) return null

    const companyInfo = await getCompanyInfo()

    return (
        <div className="space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Account Settings</h2>
                    <p className="text-gray-400">Manage your profile, company, and security preferences.</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="bg-white/5 border border-white/10">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-white/10">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="company" className="data-[state=active]:bg-white/10">
                        <Building2 className="mr-2 h-4 w-4" />
                        Company
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-white/10">
                        <Bell className="mr-2 h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-white/10">
                        <Lock className="mr-2 h-4 w-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

                {/* ── Profile ─────────────────────────────────────────────── */}
                <TabsContent value="profile">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Personal Information</CardTitle>
                            <CardDescription className="text-gray-400">
                                Update your public profile details.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProfileForm user={user} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Company Information ──────────────────────────────────── */}
                <TabsContent value="company">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Company Information</CardTitle>
                            <CardDescription className="text-gray-400">
                                Configure your business details used on reports and invoices.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {companyInfo ? (
                                <CompanyForm companyInfo={companyInfo} />
                            ) : (
                                <p className="text-gray-400">Unable to load company information. Please try again later.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Notification Preferences ─────────────────────────────── */}
                <TabsContent value="notifications">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Notification Preferences</CardTitle>
                            <CardDescription className="text-gray-400">
                                Choose how you want to be notified about important updates.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {companyInfo ? (
                                <NotificationForm companyInfo={companyInfo} />
                            ) : (
                                <p className="text-gray-400">Unable to load notification preferences. Please try again later.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Security ─────────────────────────────────────────────── */}
                <TabsContent value="security">
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-white">Password & Authentication</CardTitle>
                            <CardDescription className="text-gray-400">
                                Ensure your account stays secure.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <PasswordForm />

                            {/* Two-Factor Authentication status */}
                            <div className="pt-6 border-t border-white/10">
                                <h4 className="text-sm font-medium text-white mb-4 flex items-center">
                                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-400" />
                                    Two-Factor Authentication
                                </h4>
                                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-4">
                                    <div>
                                        <p className="text-sm font-medium text-white">Status</p>
                                        <p className="text-sm text-gray-400">
                                            Two-factor authentication is not yet configured for this account.
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20">
                                        Not Enabled
                                    </span>
                                </div>
                            </div>

                            {/* Active Sessions */}
                            <div className="pt-6 border-t border-white/10">
                                <h4 className="text-sm font-medium text-white mb-4 flex items-center">
                                    <Shield className="mr-2 h-4 w-4 text-emerald-400" />
                                    Active Sessions
                                </h4>
                                <div className="text-sm text-gray-400">
                                    <p>Token Version: {user.tokenVersion}</p>
                                    <p className="mt-1">Changing your password will automatically log out all other devices.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
