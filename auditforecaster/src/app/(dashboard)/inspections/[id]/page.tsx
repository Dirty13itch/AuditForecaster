import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Save } from "lucide-react"
import { InspectionForm } from "@/components/inspection-form"
import { safeJsonParse } from "@/lib/utils"

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            inspections: {
                include: {
                    photos: true
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
            builder: true,
            inspector: true,
        }
    })

    const templates = await prisma.reportTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    })

    if (!job) {
        notFound()
    }

    const inspection = job.inspections[0]
    const inspectionData = safeJsonParse<Record<string, unknown>>(inspection?.data, {})
    const checklist = safeJsonParse(inspection?.checklist, [])

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inspection: {job.streetAddress}</h1>
                    <p className="text-gray-500">Lot {job.lotNumber} • {job.city}</p>
                </div>
                <Button variant="outline">
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                </Button>
            </div>

            {job.rejectionReason && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
                    <h3 className="font-semibold flex items-center">
                        <span className="mr-2">⚠️</span> Inspection Returned
                    </h3>
                    <p className="mt-1 text-sm">{job.rejectionReason}</p>
                </div>
            )}

            <InspectionForm
                jobId={job.id}
                inspectionId={inspection?.id}
                initialData={{
                    cfm50: inspectionData.cfm50,
                    houseVolume: inspectionData.houseVolume,
                    ach50: inspectionData.ach50,
                    notes: inspectionData.notes,
                    checklist: checklist,
                    signatureUrl: inspection?.signatureUrl || undefined,
                }}
                templates={templates.map(t => ({
                    id: t.id,
                    name: t.name,
                    checklistItems: safeJsonParse(t.checklistItems, [])
                }))}
            />
        </div>
    )
}
