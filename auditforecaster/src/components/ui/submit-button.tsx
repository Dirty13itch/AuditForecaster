'use client'

import { useFormStatus } from 'react-dom'
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { type ButtonProps } from "@/components/ui/button"

interface SubmitButtonProps extends Omit<ButtonProps, 'type'> {
    children: React.ReactNode
    loadingText?: string
}

export function SubmitButton({
    children,
    loadingText = "Submitting...",
    disabled,
    ...props
}: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            {...props}
        >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? loadingText : children}
        </Button>
    )
}
