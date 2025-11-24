import { prisma } from "@/lib/prisma";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientSwipeWrapper } from "./client-wrapper";

export default async function ClassifyMileagePage() {
    const pendingLogs = await prisma.mileageLog.findMany({
        where: { status: "PENDING" },
        orderBy: { date: "desc" },
        take: 10, // Process in batches
        include: { vehicle: true }
    });

    return (
        <div className="max-w-md mx-auto space-y-6 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/finances"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <h2 className="text-xl font-bold">Classify Mileage</h2>
                <div className="w-16" /> {/* Spacer */}
            </div>

            <div className="flex-1 relative flex items-center justify-center">
                {pendingLogs.length === 0 ? (
                    <div className="text-center space-y-4">
                        <div className="text-4xl">🎉</div>
                        <h3 className="text-xl font-semibold">All Caught Up!</h3>
                        <p className="text-muted-foreground">No pending mileage logs to classify.</p>
                        <Button asChild>
                            <Link href="/dashboard/finances">Return to Dashboard</Link>
                        </Button>
                    </div>
                ) : (
                    pendingLogs.map((log: MileageLog, index: number) => (
                        <div
                            key={log.id}
                            className="absolute w-full h-96"
                            style={{ zIndex: pendingLogs.length - index }}
                        >
                            {index === 0 ? (
                                <ClientSwipeWrapper log={log} />
                            ) : (
                                <StaticCard log={log} />
                            )}
                        </div>
                    ))
                )}
            </div>

            {pendingLogs.length > 0 && (
                <div className="text-center text-sm text-muted-foreground pb-8">
                    Swipe Right for Business, Left for Personal
                </div>
            )}
        </div>
    );
}

type MileageLog = {
    id: string
    date: Date
    distance: number
    startLocation: string | null
    endLocation: string | null
    vehicle: {
        name: string
    }
}

function StaticCard({ log }: { log: MileageLog }) {
    return (
        <Card className="w-full h-full shadow-md border-muted">
            <CardHeader>
                <CardTitle>{log.date.toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-center py-8">
                    {log.distance} mi
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Vehicle: {log.vehicle.name}</p>
                    <p>Route: {log.startLocation || 'Unknown'} → {log.endLocation || 'Unknown'}</p>
                </div>
            </CardContent>
        </Card>
    )
}
