import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, FileText, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Finances",
    description: "Track invoices and revenue.",
}

export default async function FinancesPage() {
    const [invoices, expenses] = await Promise.all([
        prisma.invoice.findMany({
            orderBy: { date: 'desc' },
            take: 10,
            include: { builder: true },
        }),
        prisma.expense.findMany({
            orderBy: { date: 'desc' },
            take: 10,
        }),
    ])

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.totalAmount, 0)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const outstandingCount = invoices.filter(i => i.status !== 'PAID' && i.status !== 'DRAFT').length

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finances</h1>
                    <p className="text-sm text-muted-foreground">Invoices and revenue overview</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/finances/invoices/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Invoice
                    </Link>
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
                        <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Collected</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                        <p className="text-xs text-muted-foreground">
                            {outstandingCount > 0 ? `${outstandingCount} outstanding` : 'All paid'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                        <p className="text-xs text-muted-foreground">{expenses.length} recorded</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invoices */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Invoices</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/finances/invoices">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No invoices yet. Create one to get started.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {invoices.slice(0, 5).map(invoice => (
                                <Link
                                    key={invoice.id}
                                    href={`/dashboard/finances/invoices/${invoice.id}`}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <div>
                                        <div className="font-medium text-sm">{invoice.number}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {invoice.builder.name} &middot; {invoice.date.toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-sm">{formatCurrency(invoice.totalAmount)}</span>
                                        <Badge variant={
                                            invoice.status === 'PAID' ? 'default' :
                                                invoice.status === 'SENT' ? 'secondary' :
                                                    invoice.status === 'OVERDUE' ? 'destructive' : 'outline'
                                        }>
                                            {invoice.status}
                                        </Badge>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
