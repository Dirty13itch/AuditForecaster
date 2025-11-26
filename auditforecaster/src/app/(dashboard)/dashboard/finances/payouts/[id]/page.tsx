import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { markPayoutAsPaid } from "@/app/actions/payouts"
import Link from "next/link"
import { ArrowLeft, CheckCircle, Download } from "lucide-react"
import { notFound } from "next/navigation"

export default async function PayoutDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const payout = await prisma.payout.findUnique({
        where: { id },
        include: {
            user: true,
            jobs: {
                orderBy: { scheduledDate: 'asc' }
            }
        }
    })

    if (!payout) {
        notFound()
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/finances/payouts">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Payout Statement</h2>
                        <p className="text-muted-foreground">
                            {payout.user.name || payout.user.email} • {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    {payout.status !== 'PAID' && (
                        <form action={async () => {
                            'use server'
                            await markPayoutAsPaid(payout.id)
                        }}>
                            <Button type="submit">
                                <CheckCircle className="mr-2 h-4 w-4" /> Mark as Paid
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <Card className="col-span-3 md:col-span-1">
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status</span>
                            <Badge variant={payout.status === 'PAID' ? 'default' : 'secondary'}>
                                {payout.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Generated</span>
                            <span>{new Date(payout.generatedAt).toLocaleDateString()}</span>
                        </div>
                        {payout.paidAt && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Paid Date</span>
                                <span>{new Date(payout.paidAt).toLocaleDateString()}</span>
                            </div>
                        )}
                        <div className="pt-4 border-t flex justify-between items-center font-bold text-lg">
                            <span>Total Payout</span>
                            <span>{formatCurrency(payout.amount)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 md:col-span-2">
                    <CardHeader>
                        <CardTitle>Job Breakdown</CardTitle>
                        <CardDescription>Jobs included in this payout period.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payout.jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>{job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{job.address}</div>
                                            <div className="text-xs text-muted-foreground">{job.lotNumber}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Note: In a real app we'd store the snapshot amount on the job relation. 
                                                For now we are just showing a placeholder or calculating on fly if we had the logic here.
                                                Since we didn't store it in the MVP create action, we'll show 'Included' or similar.
                                                Wait, I added payoutAmount to the schema! Let's use it if available.
                                            */}
                                            {job.payoutAmount ? formatCurrency(job.payoutAmount) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
