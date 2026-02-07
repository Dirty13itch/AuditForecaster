import { Metadata } from "next"
import { WeeklySchedule } from "@/components/weekly-schedule"
import { getWeekJobs, getInspectors } from "@/app/actions/schedule"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Schedule",
    description: "Weekly job schedule - assign and track inspections.",
}

export default async function SchedulePage() {
    const [result, inspectors] = await Promise.all([
        getWeekJobs(),
        getInspectors(),
    ])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
                    <p className="text-sm text-muted-foreground">
                        Assign and track jobs for the week
                    </p>
                </div>
            </div>
            <WeeklySchedule
                initialJobs={result.success ? result.jobs : []}
                inspectors={inspectors}
            />
        </div>
    )
}
