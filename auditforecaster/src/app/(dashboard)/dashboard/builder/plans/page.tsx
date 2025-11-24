import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { auth } from '@/auth';

export const metadata = {
    title: 'Builder Plans | AuditForecaster',
    description: 'View and upload builder plans',
};

export default async function BuilderPlansPage() {
    const session = await auth();
    const builderId = session?.user?.builderId;

    if (!builderId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You must be linked to a builder account to view plans.</p>
            </div>
        );
    }

    const plans = await prisma.plan.findMany({
        where: { builderId },
        include: { builder: true },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Builder Plans</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Plans</CardTitle>
                </CardHeader>
                <CardContent>
                    {plans.length === 0 ? (
                        <p className="text-muted-foreground">No plans uploaded yet</p>
                    ) : (
                        <ul className="space-y-2">
                            {plans.map((plan) => (
                                <li key={plan.id} className="border-b pb-2">
                                    <div className="font-medium">{plan.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {plan.builder.name} - {plan.description}
                                    </div>
                                    {plan.pdfUrl && (
                                        <a href={plan.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                            View PDF
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-4">
                        <Link href="/dashboard/builder/plans/upload" className="text-blue-600 hover:underline">
                            + Upload New Plan
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
