'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendQARejectionEmail } from "@/lib/email"
import { auth } from "@/auth"
import { z } from "zod"

const ApproveJobSchema = z.object({
    jobId: z.string().uuid()
})

const RejectJobSchema = z.object({
    jobId: z.string().uuid(),
    reason: z.string().min(1, "Rejection reason is required")
})

export async function approveJob(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const result = ApproveJobSchema.safeParse({
        jobId: formData.get('jobId')
    })

    if (!result.success) {
        throw new Error(result.error.errors[0].message)
    }

    await prisma.job.update({
        where: { id: result.data.jobId },
        data: {
            status: 'INVOICED', // Or REVIEWED, depending on workflow
        }
    })

    revalidatePath('/dashboard/qa')
    redirect('/dashboard/qa')
}

export async function rejectJob(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const result = RejectJobSchema.safeParse({
        jobId: formData.get('jobId'),
        reason: formData.get('reason')
    })

    if (!result.success) {
        throw new Error(result.error.errors[0].message)
    }

    const updatedJob = await prisma.job.update({
        where: { id: result.data.jobId },
        data: {
            status: 'IN_PROGRESS', // Send back to inspector
            rejectionReason: result.data.reason,
        },
        include: {
            inspector: true
        }
    })

    if (updatedJob.inspector?.email) {
        try {
            await sendQARejectionEmail(
                updatedJob.inspector.email,
                `${updatedJob.streetAddress}, ${updatedJob.city}`,
                result.data.reason,
                `${process.env.NEXTAUTH_URL}/dashboard/jobs/${result.data.jobId}`
            )
        } catch (error) {
            console.error('Failed to send rejection email:', error)
        }
    }

    revalidatePath('/dashboard/qa')
    redirect('/dashboard/qa')
}

