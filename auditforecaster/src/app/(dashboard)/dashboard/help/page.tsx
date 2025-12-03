import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Book, MessageCircle, FileText } from "lucide-react"

export default function HelpPage() {
    return (
        <div className="space-y-8 p-8 pt-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-white">How can we help you?</h2>
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search for articles..."
                        className="pl-10 bg-white/5 border-white/10 text-white"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Book className="h-5 w-5 text-emerald-400" />
                            Documentation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-400 text-sm">
                        Browse detailed guides on how to use the platform, from scheduling jobs to generating reports.
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-400" />
                            API Reference
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-400 text-sm">
                        Technical documentation for integrating with our API Gateway.
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-purple-400" />
                            Contact Support
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-gray-400 text-sm">
                        Need help? Reach out to our support team for personalized assistance.
                    </CardContent>
                </Card>
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold text-white mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                    <details className="group border border-white/10 rounded-lg bg-white/5 open:bg-white/10">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-white">
                            How do I reset my password?
                        </summary>
                        <div className="p-4 pt-0 text-gray-400">
                            Go to Settings &gt; Security and enter your new password.
                        </div>
                    </details>
                    <details className="group border border-white/10 rounded-lg bg-white/5 open:bg-white/10">
                        <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-white">
                            Can I export my data?
                        </summary>
                        <div className="p-4 pt-0 text-gray-400">
                            Yes, you can export reports as PDF. For raw data access, please contact your administrator.
                        </div>
                    </details>
                </div>
            </div>
        </div>
    )
}
