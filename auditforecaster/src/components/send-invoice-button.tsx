'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { sendInvoiceEmail } from '@/app/actions/email'

export function SendInvoiceButton({ jobId }: { jobId: string }) {
    const [isSending, setIsSending] = useState(false)
    const [sent, setSent] = useState(false)

    async function handleSend() {
        setIsSending(true)
        try {
            const result = await sendInvoiceEmail(jobId)

            if (result.error) {
                alert(result.error)
                return
            }

            setSent(true)
            alert('Invoice sent successfully!')
        } catch (error) {
            console.error('Send error:', error)
            alert('Failed to send invoice')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Button
            onClick={handleSend}
            disabled={isSending || sent}
            variant="default"
        >
            <Mail className="mr-2 h-4 w-4" />
            {sent ? 'Sent' : isSending ? 'Sending...' : 'Send Invoice'}
        </Button>
    )
}
