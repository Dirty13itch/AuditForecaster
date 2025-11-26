import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

export default async function PayoutsPage() {
    const payouts = await prisma.payout.findMany({
        include: { user: true },
        orderBy: { generatedAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Contractor Payouts</h2>
                <Button asChild>
                    <Link href="/dashboard/finances/payouts/create">
                        <Plus className="mr-2 h-4 w-4" /> Generate Payout
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payout History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Inspector</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Generated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                        No payouts generated yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payouts.map((payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell className="font-medium">{payout.user.name || payout.user.email}</TableCell>
                                        <TableCell>
                                            {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{formatCurrency(payout.amount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={payout.status === 'PAID' ? 'default' : 'secondary'}>
                                                {payout.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(payout.generatedAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/finances/payouts/${payout.id}`}>
                                                    View Details
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
