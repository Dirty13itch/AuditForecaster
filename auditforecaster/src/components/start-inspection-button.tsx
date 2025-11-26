'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { TemplateSelectionModal } from '@/components/template-selection-modal'

type StartInspectionButtonProps = {
    jobId: string
    hasInspections: boolean
    inspectionId?: string
}

export function StartInspectionButton({ jobId, hasInspections, inspectionId }: StartInspectionButtonProps) {
    const [showModal, setShowModal] = useState(false)

    if (hasInspections && inspectionId) {
        return (
            <Button asChild>
                <a href={`/dashboard/inspections/${jobId}`}>Continue Inspection</a>
            </Button>
        )
    }

    return (
        <>
            <Button onClick={() => setShowModal(true)}>
                Start Inspection
            </Button>
            {showModal && (
                <TemplateSelectionModal
                    jobId={jobId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    )
}
