import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export const metadata = {
    title: 'Builder Schedule | AuditForecaster',
    description: 'View and manage builder job schedule',
};

export default async function BuilderSchedulePage() {
    const session = await auth();
    const builderId = session?.user?.builderId;

    if (!builderId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You must be linked to a builder account to view the schedule.</p>
            </div>
        );
    }

    const upcomingJobs = await prisma.job.findMany({
        where: {
            builderId,
            scheduledDate: {
                gte: new Date()
            }
        },
        orderBy: {
            scheduledDate: 'asc'
        },
        take: 20
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Builder Schedule</h1>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Upcoming Jobs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {upcomingJobs.length === 0 ? (
                        <p className="text-muted-foreground">No upcoming jobs scheduled.</p>
                    ) : (
                        <ul className="space-y-2">
                            {upcomingJobs.map((job) => (
                                <li key={job.id} className="border-b pb-2">
                                    <div className="font-medium">{job.lotNumber} - {job.streetAddress}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {job.scheduledDate ? format(job.scheduledDate, 'MMM d, yyyy') : 'No Date'} - {job.status}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
