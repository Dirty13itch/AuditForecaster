'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from "@/auth"
import { sendInspectionCompletedEmail } from "@/lib/email"
import { z } from "zod"

const InspectionSchema = z.object({
    jobId: z.string().min(1, "Job ID is required"),
    cfm50: z.string().min(1, "CFM50 is required"),
    houseVolume: z.string().nullable().optional().transform(v => v || undefined),
    notes: z.string().nullable().optional().transform(v => v || undefined),
    checklist: z.string().nullable().optional().transform(v => v || undefined),
    signature: z.string().nullable().optional().transform(v => v || undefined),
})



export async function updateInspection(formData: FormData): Promise<never> {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    try {
        // Validate input
        const validatedFields = InspectionSchema.safeParse({
            jobId: formData.get('jobId'),
            cfm50: formData.get('cfm50'),
            houseVolume: formData.get('houseVolume'),
            notes: formData.get('notes'),
            checklist: formData.get('checklist'),
            signature: formData.get('signature'),
        })

        if (!validatedFields.success) {
            console.error('Validation failed:', validatedFields.error.flatten().fieldErrors)
            throw new Error('Please check all required fields')
        }

        const fields = validatedFields.data

        // Parse and calculate
        const houseVolume = fields.houseVolume ? parseFloat(fields.houseVolume) : null
        const checklist = fields.checklist ? JSON.parse(fields.checklist) : null

        const cfm50Val = parseFloat(fields.cfm50)
        let ach50: number | null = null
        let compliant: boolean | undefined = undefined
        let margin: number | undefined = undefined

        if (houseVolume && houseVolume > 0) {
            ach50 = (cfm50Val * 60) / houseVolume
            ach50 = Math.round(ach50 * 100) / 100

            const TARGET_ACH50 = 3.0
            compliant = ach50 <= TARGET_ACH50
            margin = Math.round((TARGET_ACH50 - ach50) * 100) / 100
        }

        const inspectionData = {
            cfm50: cfm50Val,
            houseVolume,
            ach50,
            compliant,
            margin,
            notes: fields.notes,
            timestamp: new Date().toISOString(),
        }

        // Check for existing inspection
        const existingInspection = await prisma.inspection.findFirst({
            where: { jobId: fields.jobId },
            orderBy: { createdAt: 'desc' }
        })

        // Save inspection
        if (existingInspection) {
            await prisma.inspection.update({
                where: { id: existingInspection.id },
                data: {
                    data: JSON.stringify(inspectionData),
                    checklist: JSON.stringify(checklist),
                    signatureUrl: fields.signature,
                }
            })
        } else {
            await prisma.inspection.create({
                data: {
                    jobId: fields.jobId,
                    type: 'BLOWER_DOOR',
                    data: JSON.stringify(inspectionData),
                    checklist: JSON.stringify(checklist),
                    signatureUrl: fields.signature,
                }
            })
        }

        // Update job status
        const updatedJob = await prisma.job.update({
            where: { id: fields.jobId },
            data: { status: 'COMPLETED' },
            include: { builder: true }
        })

        // Send notification (non-blocking)
        try {
            const session = await auth()
            const inspectorName = session?.user?.name || 'Unknown Inspector'
            await sendInspectionCompletedEmail(
                'admin@ulrichenergy.com',
                `${updatedJob.streetAddress}, ${updatedJob.city}`,
                inspectorName,
                `${process.env.NEXTAUTH_URL}/dashboard/jobs/${fields.jobId}`
            )
        } catch (error) {
            console.error('Failed to send notification:', error)
            // Don't fail the request if email fails
        }

        // Revalidate and redirect
        revalidatePath(`/dashboard/jobs/${fields.jobId}`)
        revalidatePath(`/dashboard/inspections/${fields.jobId}`)
        redirect(`/dashboard/jobs/${fields.jobId}`)

    } catch (error) {
        // Log error for debugging
        console.error('updateInspection error:', error)

        // Re-throw redirect errors (they're expected)
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error
        }

        // For all other errors, throw with user-friendly message
        const message = error instanceof Error ? error.message : 'Failed to save inspection. Please try again.'
        throw new Error(message)
    }
}

export async function createReinspection(jobId: string): Promise<never> {
    try {
        const session = await auth()
        if (!session) {
            throw new Error('You must be logged in to create a reinspection')
        }

        const newInspection = await prisma.inspection.create({
            data: {
                jobId,
                type: 'BLOWER_DOOR',
                data: '{}',
                checklist: '[]',
            }
        })

        await prisma.job.update({
            where: { id: jobId },
            data: { status: 'IN_PROGRESS' }
        })

        redirect(`/dashboard/inspections/${newInspection.id}`)

    } catch (error) {
        console.error('createReinspection error:', error)

        // Re-throw redirect errors
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error
        }

        const message = error instanceof Error ? error.message : 'Failed to create reinspection'
        throw new Error(message)
    }
}
