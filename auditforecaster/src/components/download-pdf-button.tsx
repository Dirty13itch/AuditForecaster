'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { generatePDF } from '@/app/actions/pdf'
import { toast } from 'sonner'

export function DownloadPDFButton({ jobId }: { jobId: string }) {
    const [isGenerating, setIsGenerating] = useState(false)

    async function handleRequest() {
        setIsGenerating(true)
        try {
            const result = await generatePDF(jobId)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('PDF generation started. It will be emailed to you.')
            }
        } catch (error) {
            console.error('Request error:', error)
            toast.error('Failed to request PDF')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Button onClick={handleRequest} disabled={isGenerating} variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            {isGenerating ? 'Requesting...' : 'Email PDF'}
        </Button>
    )
}
