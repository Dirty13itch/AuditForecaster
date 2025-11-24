'use client'

import { toast } from 'sonner'

export function useActionToast() {
    const showSuccess = (message: string, description?: string) => {
        toast.success(message, { description })
    }

    const showError = (message: string, description?: string) => {
        toast.error(message, { description })
    }

    const showLoading = (message: string) => {
        return toast.loading(message)
    }

    const dismiss = (id: string | number) => {
        toast.dismiss(id)
    }

    return {
        showSuccess,
        showError,
        showLoading,
        dismiss
    }
}
