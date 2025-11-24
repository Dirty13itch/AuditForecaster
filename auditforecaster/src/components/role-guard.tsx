'use client'

import { useSession } from "next-auth/react"

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: string[]
    fallback?: React.ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
    const { data: session } = useSession()
    const userRole = session?.user?.role

    if (!session || !userRole) {
        return <>{fallback}</>
    }

    if (allowedRoles.includes(userRole)) {
        return <>{children}</>
    }

    return <>{fallback}</>
}
