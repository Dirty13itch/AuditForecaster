'use client'

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { useState } from "react"

export function MobileNav({ userRole, onSignOut }: { userRole: string, onSignOut: () => Promise<void> }) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
                <AppSidebar userRole={userRole} onSignOut={onSignOut} className="border-none" />
            </SheetContent>
        </Sheet>
    )
}
