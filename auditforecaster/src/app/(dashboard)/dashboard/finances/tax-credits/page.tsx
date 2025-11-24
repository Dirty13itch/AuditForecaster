import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CheckCircle, Clock, XCircle } from "lucide-react"
import { format } from "date-fns"
import { updateTaxCreditStatus } from "@/app/actions/tax-credits"

export default async function TaxCreditsPage() {
    const taxCredits = await prisma.taxCredit.findMany({
        include: {
            job: {
                include: {
                    builder: true
                }
            }
        },
        orderBy: { certificationDate: 'desc' }
    })

    const stats = {
        total: taxCredits.reduce((sum, tc) => sum + tc.creditAmount, 0),
        pending: taxCredits.filter(tc => tc.status === 'PENDING').length,
        approved: taxCredits.filter(tc => tc.status === 'APPROVED').length,
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />
            case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />
            case 'DENIED': return <XCircle className="h-4 w-4 text-red-600" />
            default: return <Clock className="h-4 w-4 text-gray-600" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800'
            case 'PENDING': return 'bg-yellow-100 text-yellow-800'
            case 'DENIED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">45L Tax Credits</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Track Energy Efficient Home Tax Credits (IRC Section 45L)
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.total.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across {taxCredits.length} jobs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.approved}</div>
                        <p className="text-xs text-muted-foreground">Successfully claimed</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Credit History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {taxCredits.map((credit) => (
                            <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(credit.status)}
                                    <div>
                                        <p className="font-medium">{credit.job.address}</p>
                                        <p className="text-sm text-gray-500">
                                            {credit.job.builder?.name} • Certified {format(new Date(credit.certificationDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-bold text-lg">${credit.creditAmount.toLocaleString()}</p>
                                        <Badge className={getStatusColor(credit.status)}>
                                            {credit.status}
                                        </Badge>
                                    </div>
                                    {credit.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <form action={async () => {
                                                'use server'
                                                await updateTaxCreditStatus(credit.id, 'APPROVED')
                                            }}>
                                                <Button size="sm" variant="outline">Approve</Button>
                                            </form>
                                            <form action={async () => {
                                                'use server'
                                                await updateTaxCreditStatus(credit.id, 'DENIED')
                                            }}>
                                                <Button size="sm" variant="ghost" className="text-red-500">Deny</Button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {taxCredits.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No tax credits recorded yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
