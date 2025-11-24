import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Truck, Wrench } from "lucide-react"

export default function AssetsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/dashboard/assets/equipment">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Equipment</CardTitle>
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage</div>
                            <p className="text-xs text-muted-foreground">Testing equipment and tools</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/assets/fleet">
                    <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Fleet</CardTitle>
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage</div>
                            <p className="text-xs text-muted-foreground">Track company vehicles</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
