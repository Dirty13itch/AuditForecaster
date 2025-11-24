"use client";

import { SwipeCard } from "@/components/ui/swipe-card";
import { classifyExpense } from "@/app/actions/finances";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Expense = {
    id: string
    amount: number
    date: Date
    description: string | null
    user: {
        name: string | null
    }
}

export function ClientExpenseWrapper({ expense }: { expense: Expense }) {
    const [isVisible, setIsVisible] = useState(true);

    const handleSwipe = async (action: "Approve" | "Reject") => {
        setIsVisible(false);
        if (action === "Approve") {
            // In a real app, this would open a dialog to pick a category
            await classifyExpense(expense.id, "CLASSIFIED", "Business");
        } else {
            await classifyExpense(expense.id, "CLASSIFIED", "Personal");
        }
    };

    return isVisible ? (
        <SwipeCard
            onSwipeLeft={() => handleSwipe("Reject")}
            onSwipeRight={() => handleSwipe("Approve")}
            className="w-full h-full"
        >
            <Card className="w-full h-full border-none shadow-none bg-transparent pointer-events-none">
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
        </SwipeCard>
    ) : null;
}
