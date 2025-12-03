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
    const qrValue = `https://auditforecaster.app/assets/${assetId}`

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=600')
        if (printWindow) {
            printWindow.document.write(`
        <html>
          <head>
            <title>Asset Label - ${name}</title>
            <style>
              body { 
                font-family: sans-serif; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0; 
              }
              .label {
                border: 2px solid black;
                padding: 20px;
                text-align: center;
                border-radius: 8px;
              }
              h1 { margin: 0 0 10px 0; font-size: 18px; }
              p { margin: 10px 0 0 0; font-size: 14px; color: #555; }
            </style>
          </head>
          <body>
            <div class="label">
              <h1>${name}</h1>
              <div id="qr-target"></div>
              <p>SN: ${serialNumber}</p>
            </div>
          </body>
        </html>
      `)

            // We need to render the QR code into the new window. 
            // Since we can't easily transfer the React component, we'll rely on the user printing the dialog for now
            // or use a more complex print library. 
            // For MVP Vibe: We'll just print the current window but target the dialog content.
            // Actually, let's keep it simple: Just show the dialog and let them print the screen or use a dedicated label printer feature later.
            printWindow.close()
            window.print()
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="View QR Code">
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
