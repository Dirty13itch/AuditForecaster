import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PrintButton } from "@/components/print-button"

export const dynamic = 'force-dynamic'

export default async function EquipmentQRCodePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const equipment = await prisma.equipment.findUnique({
        where: { id }
    })

    if (!equipment) {
        notFound()
    }

    // The data encoded in the QR code. 
    // Ideally this is a URL to the check-in/out page for this item.
    // e.g., https://app.fieldinspect.com/dashboard/assets/equipment/scan?id=...
    // For local dev, we'll just encode the ID.
    const qrData = JSON.stringify({ id: equipment.id, type: 'EQUIPMENT' })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`

    return (
        <div className="space-y-6 max-w-md mx-auto text-center">
            <div className="flex items-center justify-start">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/assets/equipment">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <Card className="print:shadow-none print:border-none">
                <CardHeader>
                    <CardTitle>Asset Tag</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                    <div className="border-4 border-black p-4 rounded-lg">
                        <img src={qrUrl} alt="QR Code" width={200} height={200} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold">{equipment.name}</h3>
                        <p className="text-muted-foreground font-mono">{equipment.serialNumber || 'No Serial'}</p>
                        <p className="text-xs text-muted-foreground">{equipment.id}</p>
                    </div>

                    <PrintButton />
                </CardContent>
            </Card>
        </div>
    )
}
