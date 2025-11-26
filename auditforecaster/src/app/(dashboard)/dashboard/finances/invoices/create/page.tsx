import { prisma } from "@/lib/prisma"
import { InvoiceWizard } from "./invoice-wizard"

export default async function CreateInvoicePage() {
    const builders = await prisma.builder.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
                <p className="text-muted-foreground">Select a builder and jobs to generate an invoice.</p>
            </div>

            <InvoiceWizard builders={builders} />
        </div>
    )
}
