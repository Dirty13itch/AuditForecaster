import { TemplateForm } from "@/components/template-form"

export default function NewTemplatePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Report Template</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Define a reusable inspection checklist
                </p>
            </div>
            <TemplateForm />
        </div>
    )
}
