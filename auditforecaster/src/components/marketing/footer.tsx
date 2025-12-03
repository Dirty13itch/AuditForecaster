import Link from "next/link"

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black py-12">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-400 text-sm">
                        © 2025 AuditForecaster. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/legal/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/legal/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}
