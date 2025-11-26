import { getSavedReports } from "@/app/actions/reports"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteReportButton } from "./delete-report-button"
import { SavedReport } from "@prisma/client"

export default async function AnalyticsReportsPage() {
    const reports = await getSavedReports()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Custom Reports</h2>
                    <p className="text-muted-foreground">Create and manage your saved reports.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/analytics/reports/builder">
                        <Plus className="mr-2 h-4 w-4" /> New Report
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reports.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                        <FileText className="h-12 w-12 mb-4 opacity-50" />
                        <p>No saved reports yet.</p>
                        <Button variant="link" asChild>
                            <Link href="/dashboard/analytics/reports/builder">Create your first report</Link>
                        </Button>
                    </div>
                ) : (
                    reports.map((report: SavedReport) => (
                        <Card key={report.id}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">
                                    {report.name}
                                </CardTitle>
                                <DeleteReportButton id={report.id} />
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {report.description || "No description"}
                                </p>
                                <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    <span>Created {new Date(report.createdAt).toLocaleDateString()}</span>
                                    <Button variant="outline" size="sm">Run Report</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
