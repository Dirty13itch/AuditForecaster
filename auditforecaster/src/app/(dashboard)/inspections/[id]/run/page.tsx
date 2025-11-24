import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { InspectionRunner } from '@/components/reporting/inspection-runner/runner'
import { WeatherWidget } from '@/components/weather-widget'
import { redirect } from 'next/navigation'
import { TemplateStructure } from '@/lib/reporting/engine'

export default async function RunInspectionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth()
    if (!session?.user?.id) redirect('/auth/signin')

    const { id } = await params

    const inspection = await prisma.inspection.findUnique({
        where: { id },
        include: {
            reportTemplate: true,
            job: true
        }
    })

    if (!inspection) return <div>Inspection not found</div>
    if (!inspection.reportTemplate) return <div>Template not found</div>

    // Parse template structure
    const structure = inspection.reportTemplate.structure as unknown as TemplateStructure

    // Capture for closure
    const jobId = inspection.jobId

    // Use job coordinates if available, fallback to Austin for existing jobs
    const job = inspection.job
    const lat = job.latitude || 30.2672
    const lng = job.longitude || -97.7431

    async function handleComplete(answers: any, score: number) {
        'use server'
        await prisma.inspection.update({
            where: { id },
            data: {
                answers,
                score,
                status: 'COMPLETED'
            }
        })
        redirect(`/dashboard/jobs/${jobId}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">{inspection.reportTemplate.name}</h1>
                    <p className="text-muted-foreground">{inspection.job.streetAddress}</p>
                </div>
                <div className="w-64">
                    <WeatherWidget lat={lat} lng={lng} />
                </div>
            </div>

            <InspectionRunner
                structure={structure}
                initialAnswers={inspection.answers as any || {}}
                inspectionId={inspection.id}
                onComplete={handleComplete}
            />
        </div>
    )
}
