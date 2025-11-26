'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    ClipboardList,
    Calendar,
    Users,
    FileText,
    FileBarChart,
    LayoutTemplate,
    DollarSign,
    Receipt,
    Percent,
    CheckSquare,
    Settings,
    LogOut,
    ChevronDown,
    ChevronRight,
    Wrench,
    Truck,
    HardHat,
    MapPin,
    Activity,
    Link as LinkIcon,
    BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

type NavItem = {
    name: string
    href: string
    icon: React.ElementType
    roles: string[]
    children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: Home,
        roles: ["ADMIN"]
    },
    {
        name: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        roles: ["ADMIN"]
    },
    {
        name: "Jobs",
        href: "/dashboard/jobs",
        icon: ClipboardList,
        roles: ["ADMIN", "INSPECTOR"],
        children: [
            { name: "All Jobs", href: "/dashboard/jobs", icon: ClipboardList, roles: ["ADMIN", "INSPECTOR"] },
            { name: "Schedule", href: "/dashboard/jobs?view=calendar", icon: Calendar, roles: ["ADMIN", "INSPECTOR"] },
        ]
    },
    {
        name: "Builders",
        href: "/dashboard/builders",
        icon: Users,
        roles: ["ADMIN"],
        children: [
            { name: "Builder List", href: "/dashboard/builders", icon: Users, roles: ["ADMIN"] },
            { name: "Plans", href: "/dashboard/builders/plans", icon: FileText, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
        roles: ["ADMIN"],
        children: [
            { name: "All Reports", href: "/dashboard/reports", icon: FileBarChart, roles: ["ADMIN"] },
            { name: "Templates", href: "/dashboard/reports/templates", icon: LayoutTemplate, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Finances",
        href: "/dashboard/finances",
        icon: DollarSign,
        roles: ["ADMIN"],
        children: [
            { name: "Invoices", href: "/dashboard/finances/invoices", icon: Receipt, roles: ["ADMIN"] },
            { name: "45L Tax Credits", href: "/dashboard/finances/tax-credits", icon: Percent, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Assets",
        href: "/dashboard/assets",
        icon: Wrench,
        roles: ["ADMIN"],
        children: [
            { name: "Equipment", href: "/dashboard/assets/equipment", icon: Wrench, roles: ["ADMIN"] },
            { name: "Fleet", href: "/dashboard/assets/fleet", icon: Truck, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Team",
        href: "/dashboard/team",
        icon: Users,
        roles: ["ADMIN"],
        children: [
            { name: "Inspectors", href: "/dashboard/team/inspectors", icon: HardHat, roles: ["ADMIN"] },
            { name: "Users", href: "/dashboard/team/users", icon: Users, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Logistics",
        href: "/dashboard/logistics",
        icon: MapPin,
        roles: ["ADMIN", "INSPECTOR"],
        children: [
            { name: "Mileage & Routes", href: "/dashboard/logistics/mileage", icon: MapPin, roles: ["ADMIN", "INSPECTOR"] },
        ]
    },
    {
        name: "QA Review",
        href: "/dashboard/qa",
        icon: CheckSquare,
        roles: ["ADMIN", "QA"]
    },
    {
        name: "Admin",
        href: "/dashboard/admin",
        icon: Activity,
        roles: ["ADMIN"],
        children: [
            { name: "Integrations", href: "/dashboard/admin/integrations", icon: LinkIcon, roles: ["ADMIN"] },
            { name: "System Health", href: "/dashboard/admin/health", icon: Activity, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["ADMIN", "INSPECTOR", "QA", "BUILDER"],
        children: [
            { name: "Profile", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "INSPECTOR", "QA", "BUILDER"] },
            { name: "Pricing", href: "/dashboard/settings/pricing", icon: DollarSign, roles: ["ADMIN"] },
        ]
    },
    {
        name: "Builder Portal",
        href: "/dashboard/builder",
        icon: HardHat,
        roles: ["BUILDER"],
        children: [
            { name: "Dashboard", href: "/dashboard/builder", icon: Home, roles: ["BUILDER"] },
            { name: "My Jobs", href: "/dashboard/builder/jobs", icon: ClipboardList, roles: ["BUILDER"] },
        ]
    },
]

export function AppSidebar({ userRole, onSignOut, className }: { userRole: string, onSignOut: () => Promise<void>, className?: string }) {
    const pathname = usePathname()
    const [expandedItems, setExpandedItems] = useState<string[]>([])

    // Auto-expand the active section based on pathname
    useEffect(() => {
        const activeItem = NAV_ITEMS.find(item =>
            item.children?.some(child => pathname.startsWith(child.href))
        )
        if (activeItem && !expandedItems.includes(activeItem.name)) {
            setExpandedItems(prev => [...prev, activeItem.name])
        }
    }, [pathname])

    const toggleExpand = (name: string) => {
        setExpandedItems(prev =>
            prev.includes(name)
                ? prev.filter(item => item !== name)
                : [...prev, name]
        )
    }

    const isVisible = (item: NavItem) => item.roles.includes(userRole)

    return (
        <aside className={cn("w-full border-r bg-gray-100/40 md:w-64 md:min-h-screen flex flex-col", className)}>
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-white">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <span className="">Ulrich Energy</span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                {NAV_ITEMS.filter(isVisible).map((item) => (
                    <div key={item.name}>
                        {item.children ? (
                            <div className="space-y-1">
                                <button
                                    onClick={() => toggleExpand(item.name)}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100",
                                        pathname.startsWith(item.href) ? "text-blue-600" : "text-gray-500"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </div>
                                    {expandedItems.includes(item.name) ? (
                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 opacity-50" />
                                    )}
                                </button>

                                {expandedItems.includes(item.name) && (
                                    <div className="ml-4 pl-2 border-l space-y-1">
                                        {item.children.filter(isVisible).map((child) => (
                                            <Link
                                                key={child.name}
                                                href={child.href}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100",
                                                    pathname === child.href ? "bg-gray-100 text-blue-600 font-medium" : "text-gray-500"
                                                )}
                                            >
                                                <child.icon className="h-4 w-4" />
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-gray-100",
                                    pathname === item.href ? "bg-gray-100 text-blue-600" : "text-gray-500"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            <div className="border-t p-4 bg-white">
                <form action={onSignOut}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </form>
            </div>
        </aside>
    )
}
