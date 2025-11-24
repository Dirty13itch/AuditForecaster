import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Finances</h2>
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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mileage" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">Mileage Log</h3>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Log Trip
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
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
                                                <TableCell>{log.purpose}</TableCell>
                                                <TableCell>{log.startLocation} → {log.endLocation}</TableCell>
                                                <TableCell>{log.distance} mi</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
