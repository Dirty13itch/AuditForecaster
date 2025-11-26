import { prisma } from "@/lib/prisma"
import { PayoutWizard } from "./payout-wizard"

export default async function CreatePayoutPage() {
    // Fetch users who are inspectors or have jobs assigned
    // Ideally filter by role, but for now let's get all users to be safe
    const inspectors = await prisma.user.findMany({
        where: {
            // role: 'INSPECTOR' // Uncomment if roles are strictly enforced
        },
        select: {
            id: true,
            name: true,
            email: true
        }
    })

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Generate Payout</h2>
                <p className="text-muted-foreground">Calculate and generate a payout statement for an inspector.</p>
            </div>

            <PayoutWizard inspectors={inspectors} />
        </div>
    )
}
