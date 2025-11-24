import { auth, signOut } from "@/auth"
import { ToastProvider } from "@/components/ui/use-toast"
import { AppSidebar } from "@/components/app-sidebar"

import { AICopilot } from "@/components/ai-copilot"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    const role = (session?.user as { role?: string })?.role || ""

    return (
        <ToastProvider>
            {/* Skip to main content link for accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
            >
                Skip to main content
            </a>
            <div className="flex min-h-screen flex-col md:flex-row">
                <AppSidebar
                    userRole={role}
                    onSignOut={async () => {
                        'use server';
                        await signOut({ redirectTo: '/login' });
                    }}
                />
                <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-gray-50/50">
                    {children}
                </main>
            </div>
            <AICopilot />
        </ToastProvider>
    )
}
