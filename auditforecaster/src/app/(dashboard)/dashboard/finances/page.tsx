import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Metadata } from "next";
import { MileageSwipe } from "@/components/finance/mileage-swipe";
import { AutoClassifyButton } from "@/components/finance/auto-classify-button";

export const metadata: Metadata = {
    title: "Finances | AuditForecaster",
    description: "Track expenses, mileage, and financial reports.",
};

export default async function FinancesPage() {
    const expenses = await prisma.expense.findMany({
        orderBy: { date: 'desc' },
        take: 20,
        include: { user: true }
    });

    const mileageLogs = await prisma.mileageLog.findMany({
        orderBy: { date: 'desc' },
        take: 20,
        include: { vehicle: true }
    });

    const pendingLogs = await prisma.mileageLog.findMany({
        where: { status: 'PENDING' },
        orderBy: { date: 'desc' },
        take: 50
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Finances</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Total Asset Value</p>
                            <div className="text-2xl font-bold">
                                ${(await prisma.equipment.aggregate({ _sum: { purchasePrice: true } }))._sum.purchasePrice?.toLocaleString() ?? "0.00"}
                            </div>
                        </div>
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <span className="font-bold">$</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="expenses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="mileage">Mileage</TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Expense Tracker</h3>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Expense
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Receipt</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                                    No expenses recorded.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            expenses.map(expense => (
                                                <TableRow key={expense.id}>
                                                    <TableCell>{expense.date.toLocaleDateString()}</TableCell>
                                                    <TableCell>{expense.category}</TableCell>
                                                    <TableCell>{expense.description}</TableCell>
                                                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                                                    <TableCell>{expense.user.name}</TableCell>
                                                    <TableCell>
                                                        {expense.receiptUrl && (
                                                            <Button variant="ghost" size="icon" asChild>
                                                                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                                                                    <FileText className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mileage" className="space-y-4">
                    {/* Swipe Interface for Pending Logs */}
                    {pendingLogs.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Pending Classification</h3>
                                <AutoClassifyButton />
                            </div>
                            <MileageSwipe logs={pendingLogs} onComplete={() => {}} />
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Mileage Log</h3>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Log Trip
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Vehicle</TableHead>
                                            <TableHead>Purpose</TableHead>
                                            <TableHead>Route</TableHead>
                                            <TableHead>Distance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mileageLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                                    No mileage logs recorded.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            mileageLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.date.toLocaleDateString()}</TableCell>
                                                    <TableCell>{log.vehicle.name}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            log.purpose === 'BUSINESS' ? 'bg-green-100 text-green-700' :
                                                            log.purpose === 'PERSONAL' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {log.purpose || 'PENDING'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{log.startLocation} → {log.endLocation}</TableCell>
                                                    <TableCell>{log.distance} mi</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
