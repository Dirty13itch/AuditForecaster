import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, Car, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Dashboard | Field Inspect",
    description: "Overview of company expenses, mileage, and compliance.",
};

export default async function AdminPage() {
    const expenses = await prisma.expense.aggregate({
        _sum: { amount: true }
    });

    const mileage = await prisma.mileageLog.aggregate({
        _sum: { distance: true }
    });

    const expiredDocsCount = await prisma.complianceDoc.count({
        where: {
            expirationDate: { lt: new Date() }
        }
    });

    const corporateDocs = await prisma.corporateDoc.findMany({
        orderBy: { date: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses (YTD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${expenses._sum.amount?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mileage</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mileage._sum.distance?.toFixed(1) || '0.0'} mi</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Compliance Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{expiredDocsCount}</div>
                        <p className="text-xs text-muted-foreground">Expired documents</p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Corporate Vault</h3>
                    <Button>Upload Document</Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {corporateDocs.length === 0 ? (
                        <p className="text-muted-foreground col-span-full">No corporate documents uploaded.</p>
                    ) : (
                        corporateDocs.map(doc => (
                            <Card key={doc.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        {doc.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{doc.type}</p>
                                    <p className="text-xs text-muted-foreground">{doc.date.toLocaleDateString()}</p>
                                    <Button variant="link" className="px-0 h-auto mt-2" asChild>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View Document</a>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
