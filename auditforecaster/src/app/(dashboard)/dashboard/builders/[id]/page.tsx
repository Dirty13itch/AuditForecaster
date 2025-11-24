import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, MapPin } from "lucide-react"
import Link from "next/link"
import { SubdivisionForm } from "@/components/subdivision-form"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default async function BuilderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const builder = await prisma.builder.findUnique({
        where: { id },
        include: {
            subdivisions: {
                include: {
                    _count: {
                        select: { jobs: true }
                    }
                },
                orderBy: { name: 'asc' }
            },
            priceLists: {
                include: {
                    _count: {
                        select: { items: true }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            },
            _count: {
                select: { jobs: true }
            }
        }
    })

    if (!builder) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/builders">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{builder.name}</h1>
                    <p className="text-muted-foreground">Builder Profile & Configuration</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Builder Info */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Total Jobs</div>
                                <div className="text-2xl font-bold">{builder._count.jobs}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Subdivisions</div>
                                <div className="text-2xl font-bold">{builder.subdivisions.length}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Price Lists</div>
                                <div className="text-2xl font-bold">{builder.priceLists.length}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Contact</div>
                                <div className="text-sm">{builder.email || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{builder.phone}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Subdivisions */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Subdivisions</CardTitle>
                            <CardDescription>Manage subdivisions for this builder.</CardDescription>
                        </div>
                        <SubdivisionForm builderId={builder.id} />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {builder.subdivisions.map((sub) => (
                                <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <div className="font-medium">{sub.name}</div>
                                            <div className="text-sm text-muted-foreground">{sub._count.jobs} jobs</div>
                                        </div>
                                    </div>
                                    <SubdivisionForm builderId={builder.id} subdivision={sub} trigger={
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    } />
                                </div>
                            ))}
                            {builder.subdivisions.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No subdivisions found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Price Lists */}
                <Card>
                    <CardHeader>
                        <CardTitle>Price Lists</CardTitle>
                        <CardDescription>Builder-specific pricing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {builder.priceLists.map((list) => (
                                <div key={list.id} className="p-4 border rounded-lg">
                                    <div className="font-medium">{list.name}</div>
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant="secondary">{list._count.items} items</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(list.updatedAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {builder.priceLists.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No custom price lists.
                                </div>
                            )}
                            <Button variant="outline" className="w-full mt-4" asChild>
                                <Link href="/dashboard/settings/pricing">Manage Pricing</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
