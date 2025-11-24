import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { SendInvoiceButton } from "@/components/send-invoice-button"

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: true
        }
    })

    if (!job) notFound()

    // Mock invoice data
    const invoiceNumber = `INV-${job.lotNumber}-${format(new Date(), 'yyyyMMdd')}`
    const amount = 350.00 // Standard fee

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 shadow-sm print:shadow-none">
            {/* Print Button (Hidden in Print) */}
            <div className="flex justify-end gap-2 mb-8 print:hidden">
                <SendInvoiceButton jobId={job.id} />
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Invoice
                </Button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-start border-b pb-8 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ulrich Energy Auditing</h1>
                    <p className="text-gray-500 mt-1">123 Energy Way<br />Green City, ST 12345</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold text-gray-900">INVOICE</h2>
                    <p className="text-gray-500 mt-1">#{invoiceNumber}</p>
                    <p className="text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</p>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                <div className="text-gray-900">
                    <p className="font-medium">{job.builder?.name}</p>
                    <p>{job.builder?.address || 'Address on file'}</p>
                    <p>{job.builder?.email}</p>
                </div>
            </div>

            {/* Job Details */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Service Details</h3>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2 font-medium text-gray-500">Description</th>
                            <th className="py-2 font-medium text-gray-500 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="py-4">
                                <p className="font-medium">Energy Audit Inspection</p>
                                <p className="text-sm text-gray-500">{job.streetAddress}, Lot {job.lotNumber}</p>
                                <p className="text-sm text-gray-500">Performed by: {job.inspector?.name}</p>
                            </td>
                            <td className="py-4 text-right">${amount.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Total */}
            <div className="flex justify-end">
                <div className="w-1/3">
                    <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium">${amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-lg">${amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t text-center text-gray-500 text-sm">
                <p>Thank you for your business!</p>
                <p className="mt-1">Please make checks payable to Ulrich Energy Auditing.</p>
            </div>
        </div>
    )
}
