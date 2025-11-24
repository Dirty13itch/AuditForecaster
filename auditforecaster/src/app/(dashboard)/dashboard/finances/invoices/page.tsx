import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"

export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">No invoices found.</p>
                </CardContent>
            </Card>
        </div>
    )
}
