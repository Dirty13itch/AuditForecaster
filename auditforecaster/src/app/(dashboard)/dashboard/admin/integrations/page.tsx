import { Metadata } from 'next'
import { IntegrationsForm } from './integrations-form'
import { getSyncStatus } from '@/app/actions/google'

export const metadata: Metadata = {
    title: 'Integrations | AuditForecaster',
    description: 'Manage Google Workspace integrations',
}

export default async function IntegrationsPage() {
    const status = await getSyncStatus()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Integrations</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="col-span-2">
                    <IntegrationsForm initialStatus={status} />
                </div>
            </div>
        </div>
    )
}
