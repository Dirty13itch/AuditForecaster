import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ClipboardCheck, Calendar, User, MapPin } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Inspections",
    description: "View and manage energy audit inspections.",
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "COMPLETED":
            return "default"
        case "IN_PROGRESS":
            return "secondary"
        default:
            return "outline"
    }
}

function formatDate(date: Date | null): string {
    if (!date) return "Not scheduled"
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

export default async function InspectionsPage() {
    const session = await auth()
    if (!session) redirect("/login")

    const inspections = await prisma.inspection.findMany({
        include: {
            job: {
                include: {
                    builder: true,
                    inspector: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
                <p className="text-sm text-muted-foreground">
                    {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
                </p>
            </div>

            {inspections.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No inspections yet. Inspections are created from the Schedule when you complete a job.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {inspections.map((inspection) => (
                        <Link
                            key={inspection.id}
                            href={`/dashboard/inspections/${inspection.id}`}
                            className="block transition-shadow hover:shadow-md rounded-lg"
                        >
                            <Card className="h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base leading-tight">
                                            {inspection.job.streetAddress}
                                        </CardTitle>
                                        <Badge variant={statusVariant(inspection.status)}>
                                            {inspection.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{inspection.type.replace(/_/g, " ")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{inspection.job.city}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{formatDate(inspection.createdAt)}</span>
                                    </div>
                                    {inspection.job.inspector && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{inspection.job.inspector.name}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
