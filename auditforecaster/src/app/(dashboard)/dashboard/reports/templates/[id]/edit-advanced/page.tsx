import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { EditAdvancedTemplateClient } from "@/components/reporting/edit-advanced-template-client"
import { TemplateStructure } from "@/lib/reporting/engine"
import { safeJsonParse } from "@/lib/utils"

export default async function EditAdvancedTemplatePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const template = await prisma.reportTemplate.findUnique({
        where: { id }
    })

    if (!template) {
        notFound()
    }

    return (
        <EditAdvancedTemplateClient
            template={{
                id: template.id,
                name: template.name,
                description: template.description,
                structure: safeJsonParse<TemplateStructure>(template.structure, { pages: [], logic: [] })
            }}
        />
    )
}
