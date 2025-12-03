import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User as UserIcon, Lock, Shield } from "lucide-react"
import { ProfileForm } from "@/components/settings/profile-form"
import { PasswordForm } from "@/components/settings/password-form"

export default async function SettingsPage() {
    const session = await auth()
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) return null

    return (
        <div className="space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Account Settings</h2>
                    <p className="text-gray-400">Manage your profile and security preferences.</p>
                </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="bg-white/5 border border-white/10">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-white/10">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-white/10">
                        <Lock className="mr-2 h-4 w-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

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
