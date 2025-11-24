"use client"

import * as React from "react"
import { X } from "lucide-react"

const ToastContext = React.createContext<{
    toasts: Toast[]
    addToast: (toast: Omit<Toast, "id">) => void
    removeToast: (id: string) => void
} | null>(null)

type Toast = {
    id: string
    title?: string
    description?: string
    variant?: "default" | "destructive" | "success"
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([])

    const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
        const id = Math.random().toString(36).slice(2)
        setToasts((prev) => [...prev, { ...toast, id }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              min-w-[300px] rounded-md border p-4 shadow-lg transition-all
              ${toast.variant === "destructive" ? "bg-red-600 text-white border-red-600" :
                                toast.variant === "success" ? "bg-green-600 text-white border-green-600" :
                                    "bg-white text-gray-900 border-gray-200"}
            `}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="grid gap-1">
                                {toast.title && <div className="font-semibold">{toast.title}</div>}
                                {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-current opacity-50 hover:opacity-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = React.useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return {
        toast: context.addToast,
        dismiss: context.removeToast,
    }
}
