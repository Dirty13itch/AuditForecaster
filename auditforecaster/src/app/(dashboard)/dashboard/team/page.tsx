import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Users, UserCheck } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Team Management | Field Inspect",
    description: "Manage inspectors and user accounts.",
}

export default function TeamPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Team</h1>
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/dashboard/team/inspectors">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inspectors</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage</div>
                            <p className="text-xs text-muted-foreground">Field inspection team</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/team/users">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage</div>
                            <p className="text-xs text-muted-foreground">User accounts and permissions</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
