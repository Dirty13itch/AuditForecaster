import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ClipboardList, Building2, BarChart3, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-900">Ulrich Energy</h1>
                    <p className="text-xs text-slate-500">Auditing Platform</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 hover:text-slate-900">
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Link>
                    <Link href="/dashboard/jobs" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 hover:text-slate-900">
                        <ClipboardList size={18} />
                        Jobs
                    </Link>
                    <Link href="/dashboard/builders" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 hover:text-slate-900">
                        <Building2 size={18} />
                        Builders
                    </Link>
                    <Link href="/dashboard/financials" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 hover:text-slate-900">
                        <BarChart3 size={18} />
                        Financials
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 rounded-md hover:bg-slate-100 hover:text-slate-900">
                        <Settings size={18} />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut size={18} />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:hidden">
                    <span className="font-bold">Ulrich Energy</span>
                    {/* Mobile menu trigger would go here */}
                </header>
                <div className="flex-1 p-6 overflow-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
