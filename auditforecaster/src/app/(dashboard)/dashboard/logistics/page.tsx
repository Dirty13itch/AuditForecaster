import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Map, Car, ArrowRight } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Logistics Dashboard | Field Inspect",
    description: "Manage fleet mileage and route planning",
}

export default function LogisticsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Logistics</h1>
                <p className="text-muted-foreground">Manage fleet operations and route planning.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Mileage Card */}
                <Link href="/dashboard/logistics/mileage" className="group">
                    <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-medium group-hover:text-primary transition-colors">
                                Mileage Log
                            </CardTitle>
                            <Car className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Track vehicle mileage, trip purposes, and reimbursement calculations.
                                </p>
                                <div className="flex items-center text-sm font-medium text-primary">
                                    View Logs <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Routes Card */}
                <Link href="/dashboard/logistics/routes" className="group">
                    <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-medium group-hover:text-primary transition-colors">
                                Route Planning
                            </CardTitle>
                            <Map className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Optimize daily inspection routes and manage travel schedules.
                                </p>
                                <div className="flex items-center text-sm font-medium text-primary">
                                    Plan Routes <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
