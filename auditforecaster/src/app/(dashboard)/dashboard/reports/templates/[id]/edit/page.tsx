import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { TemplateForm } from "@/components/template-form"

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const template = await prisma.reportTemplate.findUnique({
        where: { id }
    })

    if (!template) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Edit Template</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Modify checklist items and settings
                </p>
            </div>
            <TemplateForm template={{
                ...template,
                description: null,
                checklistItems: typeof template.checklistItems === 'string'
                    ? JSON.parse(template.checklistItems)
                    : []
            }} />
        </div>
    )
}
