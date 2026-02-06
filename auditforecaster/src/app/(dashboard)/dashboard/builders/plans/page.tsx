import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PlansBuilderFilter } from "./plans-builder-filter"
import Link from "next/link"

const DEFAULT_PAGE_SIZE = 50

export default async function PlansPage({
    searchParams,
}: {
    searchParams: Promise<{ builderId?: string; q?: string; page?: string }>
}) {
    const session = await auth()
    if (!session) redirect('/login')

    const params = await searchParams
    const builderFilter = params.builderId || ""
    const query = params.q || ""
    const page = Math.max(1, parseInt(params.page || '1') || 1)
    const limit = DEFAULT_PAGE_SIZE

    const where: Record<string, unknown> = {}

    // Multi-Tenancy: BUILDER role users can only see their own builder's plans
    if (session.user.role === 'BUILDER' && session.user.builderId) {
        where.builderId = session.user.builderId
    } else if (builderFilter) {
        where.builderId = builderFilter
    }

    if (query) {
        where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { builder: { name: { contains: query, mode: 'insensitive' } } },
        ]
    }

    const [plans, totalCount, builders] = await Promise.all([
        prisma.plan.findMany({
            where,
            include: {
                builder: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: (page - 1) * limit,
        }),
        prisma.plan.count({ where }),
        prisma.builder.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    // Determine if the builder filter should be shown (not for BUILDER role users)
    const showBuilderFilter = session.user.role !== 'BUILDER'

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Builder Plans
                    </h1>
                    <p className="text-gray-500">
                        Manage uploaded builder plans and documents.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{totalCount} plan{totalCount !== 1 ? 's' : ''}</Badge>
                </div>
            </div>

            {showBuilderFilter && (
                <PlansBuilderFilter
                    builders={builders}
                    currentBuilderId={builderFilter}
                />
            )}

            {plans.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No plans found"
                    description={
                        builderFilter || query
                            ? "No plans match the current filters. Try adjusting your search criteria."
                            : "No builder plans have been uploaded yet."
                    }
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Plans</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan Name</TableHead>
                                    <TableHead>Builder</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Upload Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="font-medium">{plan.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {plan.builder.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                            {plan.description || "No description"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(plan.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {plan.pdfUrl ? (
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a
                                                        href={plan.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Download
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No file
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {(page - 1) * limit + 1} to{' '}
                                    {Math.min(page * limit, totalCount)} of {totalCount} plans
                                </p>
                                <div className="flex gap-2">
                                    {page > 1 && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link
                                                href={{
                                                    pathname: '/dashboard/builders/plans',
                                                    query: {
                                                        ...(builderFilter ? { builderId: builderFilter } : {}),
                                                        ...(query ? { q: query } : {}),
                                                        page: String(page - 1),
                                                    },
                                                }}
                                            >
                                                Previous
                                            </Link>
                                        </Button>
                                    )}
                                    {page < totalPages && (
                                        <Button variant="outline" size="sm" asChild>
                                            <Link
                                                href={{
                                                    pathname: '/dashboard/builders/plans',
                                                    query: {
                                                        ...(builderFilter ? { builderId: builderFilter } : {}),
                                                        ...(query ? { q: query } : {}),
                                                        page: String(page + 1),
                                                    },
                                                }}
                                            >
                                                Next
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
