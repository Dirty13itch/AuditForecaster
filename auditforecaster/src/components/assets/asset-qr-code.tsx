'use client'

import { QRCodeSVG } from 'qrcode.react'
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface AssetQRCodeProps {
    assetId: string
    name: string
    serialNumber: string
}

export function AssetQRCode({ assetId, name, serialNumber }: AssetQRCodeProps) {
    // In a real app, this would point to the asset's public URL or deep link
    const qrValue = `https://fieldinspect.app/assets/${assetId}`

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="View QR Code" aria-label="View QR Code">
                    <div className="h-6 w-6 flex items-center justify-center rounded-md border bg-white">
                        <div className="h-3 w-3 bg-black" />
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Asset Label</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4 border-2 border-dashed rounded-lg bg-slate-50">
                    <div className="text-center">
                        <h3 className="font-bold text-lg">{name}</h3>
                        <p className="text-sm text-muted-foreground">{serialNumber}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <QRCodeSVG value={qrValue} size={150} />
                    </div>
                    <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                        Scan to view asset details, history, and calibration status.
                    </p>
                </div>
                <div className="flex justify-end">
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Label
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
