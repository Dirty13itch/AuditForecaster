import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { ArrowLeft, Download, Mail, CheckCircle, Trash } from "lucide-react"
import Link from "next/link"
import { updateInvoiceStatus, deleteInvoice } from "@/app/actions/invoices"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            builder: true,
            items: {
                include: {
                    job: true
                }
            }
        }
    })

    if (!invoice) {
        notFound()
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/finances/invoices">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Invoices
                    </Link>
                </Button>
                <div className="flex gap-2">
                    {invoice.status === 'DRAFT' && (
                        <form action={async () => {
                            'use server'
                            await deleteInvoice(invoice.id)
                        }}>
                            <Button variant="destructive" size="sm">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </form>
                    )}
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                    {invoice.status === 'DRAFT' && (
                        <form action={async () => {
                            'use server'
                            await updateInvoiceStatus(invoice.id, 'SENT')
                        }}>
                            <Button size="sm">
                                <Mail className="mr-2 h-4 w-4" />
                                Mark as Sent
                            </Button>
                        </form>
                    )}
                    {invoice.status === 'SENT' && (
                        <form action={async () => {
                            'use server'
                            await updateInvoiceStatus(invoice.id, 'PAID')
                        }}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Paid
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Invoice Header */}
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{invoice.number}</CardTitle>
                        <p className="text-muted-foreground">
                            Issued: {invoice.date.toLocaleDateString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <Badge className="mb-2" variant={
                            invoice.status === 'PAID' ? 'default' :
                                invoice.status === 'SENT' ? 'secondary' :
                                    invoice.status === 'OVERDUE' ? 'destructive' : 'outline'
                        }>
                            {invoice.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                            Due: {invoice.dueDate.toLocaleDateString()}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-1">Bill To:</h3>
                            <div className="text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">{invoice.builder.name}</p>
                                <p>{invoice.builder.address}</p>
                                <p>{invoice.builder.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="font-semibold mb-1">Total Amount:</h3>
                            <p className="text-3xl font-bold">
                                {formatCurrency(invoice.totalAmount)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{item.description}</p>
                                            {item.job && (
                                                <p className="text-xs text-muted-foreground">
                                                    Job: {item.job.lotNumber}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                                <TableCell className="text-right font-bold">{formatCurrency(invoice.totalAmount)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
