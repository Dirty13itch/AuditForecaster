import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { deleteTemplate } from "@/app/actions/templates"
import { TemplateStructure } from "@/lib/reporting/engine"

export default async function TemplatesPage() {
    const templates = await prisma.reportTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Report Templates</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Customize inspection checklists and report formats
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/reports/templates/new">
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Simple Template
                        </Button>
                    </Link>
                    <Link href="/dashboard/reports/templates/new-advanced">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Advanced Template
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                    <Card key={template.id} className={template.isDefault ? "border-blue-500 border-2" : ""}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    {template.isDefault && (
                                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Default Template
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="text-sm text-gray-600">
                                    {template.structure ? (
                                        <>
                                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium mb-2">
                                                Advanced
                                            </span>
                                            <div>
                                                <span className="font-medium">
                                                    {(template.structure as unknown as TemplateStructure)?.pages?.length || 0} pages
                                                </span>
                                                {(template.structure as unknown as TemplateStructure)?.logic?.length > 0 && (
                                                    <span className="ml-2 text-purple-600">
                                                        • {(template.structure as unknown as TemplateStructure).logic.length} logic rules
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mb-2">
                                                Simple
                                            </span>
                                            <div>
                                                <span className="font-medium">
                                                    {typeof template.checklistItems === 'string'
                                                        ? JSON.parse(template.checklistItems).length
                                                        : 0} checklist items
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={template.structure
                                            ? `/dashboard/reports/templates/${template.id}/edit-advanced`
                                            : `/dashboard/reports/templates/${template.id}/edit`
                                        }
                                        className="flex-1"
                                    >
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <form action={async () => {
                                        'use server'
                                        await deleteTemplate(template.id)
                                    }}>
                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <Card className="col-span-full">
                        <CardContent className="pt-6">
                            <div className="text-center py-12">
                                <p className="text-gray-500 mb-4">No templates yet. Create your first one!</p>
                                <Link href="/dashboard/reports/templates/new">
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Template
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
