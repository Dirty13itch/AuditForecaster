import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export function Navbar() {
    return (
        <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
                    <Shield className="h-6 w-6 text-emerald-400" />
                    <span>AuditForecaster</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Features
                    </Link>
                    <Link href="/dashboard/help" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Support
                    </Link>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                            Log in
                        </Button>
                    </Link>
                    <Link href="/login">
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}
