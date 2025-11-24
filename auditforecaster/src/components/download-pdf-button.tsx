'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { generatePDF } from '@/app/actions/pdf'

export function DownloadPDFButton({ jobId }: { jobId: string }) {
    const [isGenerating, setIsGenerating] = useState(false)

    async function handleDownload() {
        setIsGenerating(true)
        try {
            const result = await generatePDF(jobId)

            if (result.error) {
                alert(result.error)
                return
            }

            if (result.pdf && result.filename) {
                // Convert base64 to blob
                const byteCharacters = atob(result.pdf)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: 'application/pdf' })

                // Create download link
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = result.filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            }
        } catch (error) {
            console.error('Download error:', error)
            alert('Failed to download PDF')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button onClick={handleDownload} disabled={isGenerating} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
        </Button>
    )
}
