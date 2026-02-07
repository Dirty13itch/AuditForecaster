'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Calendar,
    ClipboardCheck,
    Wrench,
    DollarSign,
    Settings,
    LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavItem = {
    name: string
    href: string
    icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
    {
        name: "Schedule",
        href: "/dashboard",
        icon: Calendar,
    },
    {
        name: "Inspections",
        href: "/dashboard/inspections",
        icon: ClipboardCheck,
    },
    {
        name: "Equipment",
        href: "/dashboard/equipment",
        icon: Wrench,
    },
    {
        name: "Finances",
        href: "/dashboard/finances",
        icon: DollarSign,
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
    },
]

export function AppSidebar({ userRole, onSignOut, className }: { userRole: string, onSignOut: () => Promise<void>, className?: string }) {
    const pathname = usePathname()

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard"
        return pathname.startsWith(href)
    }

    return (
        <aside className={cn("w-full border-r bg-white md:w-56 md:min-h-screen flex flex-col", className)}>
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-5">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>Field Inspect</span>
                </Link>
            </div>

            <nav className="flex-1 py-4 px-2 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                            isActive(item.href)
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                    >
                        <item.icon className={cn("h-4 w-4", isActive(item.href) ? "text-blue-600" : "")} />
                        {item.name}
                    </Link>
                ))}
            </nav>

            <div className="border-t p-3">
                <form action={onSignOut}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-gray-500 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </form>
            </div>
        </aside>
    )
}
