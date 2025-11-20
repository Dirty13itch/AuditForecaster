import React from 'react';
import Link from 'next/link';
import { ClipboardList, RefreshCw, User } from 'lucide-react';

export default function InspectorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-10">
                <h1 className="text-lg font-bold">Ulrich Field App</h1>
            </header>

            <main className="flex-1 p-4 pb-20">
                {children}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-10">
                <Link href="/inspector" className="flex flex-col items-center text-slate-600 hover:text-slate-900">
                    <ClipboardList size={24} />
                    <span className="text-xs mt-1">Jobs</span>
                </Link>
                <button className="flex flex-col items-center text-slate-600 hover:text-slate-900">
                    <RefreshCw size={24} />
                    <span className="text-xs mt-1">Sync</span>
                </button>
                <Link href="/inspector/profile" className="flex flex-col items-center text-slate-600 hover:text-slate-900">
                    <User size={24} />
                    <span className="text-xs mt-1">Profile</span>
                </Link>
            </nav>
        </div>
    );
}
