import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ClipboardCheck, Calendar, User } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Inspections | AuditForecaster",
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

export default async function InspectionsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>
}) {
    const session = await auth()
    if (!session) redirect("/login")

    const params = await searchParams
    const page = Math.max(1, parseInt(params.page || "1") || 1)
    const pageSize = 25
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    // Multi-Tenancy: scope inspections by role
    if (session.user.role === "BUILDER" && session.user.builderId) {
        where.job = { builderId: session.user.builderId }
    } else if (session.user.role === "INSPECTOR") {
        where.job = { inspectorId: session.user.id }
    }

    const [inspections, totalCount] = await Promise.all([
        prisma.inspection.findMany({
            where,
            include: {
                job: {
                    include: {
                        builder: true,
                        inspector: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: pageSize,
            skip,
        }),
        prisma.inspection.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Inspections</h1>
                <p className="text-gray-500">View and manage energy audit inspections across all jobs.</p>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <ClipboardCheck className="h-4 w-4" />
                <span>
                    {totalCount} {totalCount === 1 ? "inspection" : "inspections"} found
                </span>
            </div>

            {/* Inspection Cards */}
            {inspections.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                        No inspections found.
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
                                            {inspection.job.streetAddress}, {inspection.job.city}
                                        </CardTitle>
                                        <Badge variant={statusVariant(inspection.status)}>
                                            {inspection.status.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{inspection.type.replace(/_/g, " ")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{formatDate(inspection.createdAt)}</span>
                                    </div>
                                    {inspection.job.inspector && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <User className="h-3.5 w-3.5 flex-shrink-0" />
                                            <span>{inspection.job.inspector.name || inspection.job.inspector.email}</span>
                                        </div>
                                    )}
                                    {inspection.job.builder && (
                                        <p className="text-xs text-gray-400">
                                            Builder: {inspection.job.builder.name}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/dashboard/inspections?page=${page - 1}`}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Previous
                        </Link>
                    )}
                    <span className="px-3 py-1.5 text-sm text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/dashboard/inspections?page=${page + 1}`}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Next
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
