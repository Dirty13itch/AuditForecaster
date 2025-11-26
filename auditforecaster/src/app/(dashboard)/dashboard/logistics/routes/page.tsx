import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Map } from "lucide-react"
import { RouteGenerator } from "./route-generator"

export default async function RoutesPage() {
    const routes = await prisma.route.findMany({
        include: {
            driver: true,
            stops: true
        },
        orderBy: {
            date: 'desc'
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Route Optimization</h2>
                    <p className="text-muted-foreground">Manage daily routes for inspectors.</p>
                </div>
                <RouteGenerator />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Routes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Stops</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {routes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                        No routes generated.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                routes.map((route) => (
                                    <TableRow key={route.id}>
                                        <TableCell>{new Date(route.date).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{route.driver.name || route.driver.email}</TableCell>
                                        <TableCell>{route.stops.length} Stops</TableCell>
                                        <TableCell>
                                            <Badge variant={route.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                {route.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/logistics/routes/${route.id}`}>
                                                    <Map className="mr-2 h-4 w-4" /> View Route
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
