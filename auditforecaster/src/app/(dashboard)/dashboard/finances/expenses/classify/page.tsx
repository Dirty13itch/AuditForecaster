import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ClientExpenseWrapper } from "./client-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";




export default async function ClassifyExpensesPage() {
    const pendingExpenses = await prisma.expense.findMany({
        where: { status: "PENDING" },
        orderBy: { date: "desc" },
        take: 10,
        include: { user: true }
    });

    return (
        <div className="max-w-md mx-auto space-y-6 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/finances"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <h2 className="text-xl font-bold">Classify Expenses</h2>
                <div className="w-16" />
            </div>

            <div className="flex-1 relative flex items-center justify-center">
                {pendingExpenses.length === 0 ? (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">🎉</div>
                        <h3 className="text-xl font-semibold">All Caught Up!</h3>
                        <p className="text-muted-foreground">No pending expenses to classify.</p>
                        <Button asChild>
                            <Link href="/dashboard/finances">Return to Dashboard</Link>
                        </Button>
                    </div>
                ) : (
                    pendingExpenses.map((expense: Expense, index: number) => (
                        <div
                            key={expense.id}
                            className="absolute w-full h-96"
                            style={{ zIndex: pendingExpenses.length - index }}
                        >
                            {index === 0 ? (
                                <ClientExpenseWrapper expense={expense} />
                            ) : (
                                <StaticCard expense={expense} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {pendingExpenses.length > 0 && (
                <div className="text-center text-sm text-muted-foreground pb-8">
                    Swipe Right to Approve, Left to Reject
                </div>
            )}
        </div>
    );
}



type Expense = {
    id: string
    amount: number
    date: Date
    description: string | null
    user: {
        name: string | null
    }
}

function StaticCard({ expense }: { expense: Expense }) {
    return (
        <Card className="w-full h-full shadow-md border-muted">
            <CardHeader>
                <CardTitle>{expense.date.toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-center py-8">
                    ${expense.amount.toFixed(2)}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>User: {expense.user.name}</p>
                    <p>Description: {expense.description || 'No description'}</p>
                </div>
            </CardContent>
        </Card>
    )
}
