import { getPendingExpenses } from "@/app/actions/expenses"
import { ApprovalDeck } from "@/components/finances/approval-deck"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ExpenseApprovalsPage() {
    const expenses = await getPendingExpenses()

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/finances/expenses">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Expense Approvals</h2>
                    <p className="text-muted-foreground">Swipe right to approve, left to reject.</p>
                </div>
            </div>

            <div className="mt-8">
                <ApprovalDeck initialExpenses={expenses} />
            </div>
        </div>
    )
}
