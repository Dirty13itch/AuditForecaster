import { prisma } from "@/lib/prisma"
import { InspectorDialog } from "@/components/team/inspector-dialog"
import { InspectorGrid } from "@/components/team/inspector-grid"
import { InspectorInput } from "@/lib/schemas"

export default async function InspectorsPage() {
    const inspectors = await prisma.user.findMany({
        where: {
            role: 'INSPECTOR'
        },
        include: {
            _count: {
                select: {
                    jobs: true
                }
            },
            certifications: true,
            onboarding: true
        },
        orderBy: { name: 'asc' }
    })

    // Transform data to match InspectorInput & id
    const formattedInspectors = inspectors.map(user => ({
        id: user.id,
        name: user.name || "",
        email: user.email,
        phone: undefined, // Add phone to User model if needed, currently not in schema
        role: "INSPECTOR" as const,
        hersRaterId: user.hersRaterId || undefined,
        baseRate: user.baseRate || undefined,
        certifications: user.certifications.map(c => ({
            name: c.name,
            licenseNumber: c.licenseNumber || undefined,
            expirationDate: c.expirationDate || undefined
        })),
        onboarding: user.onboarding ? {
            uniformIssued: user.onboarding.uniformIssued,
            ipadIssued: user.onboarding.ipadIssued,
            badgePrinted: user.onboarding.badgePrinted,
            trainingComplete: user.onboarding.trainingComplete,
            notes: user.onboarding.notes || undefined
        } : undefined,
        _count: user._count
    }))

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Inspectors</h1>
                    <p className="text-gray-400 mt-1">
                        Manage your field inspection team.
                    </p>
                </div>
                <InspectorDialog mode="create" />
            </div>

            <InspectorGrid inspectors={formattedInspectors} />
        </div>
    )
}
