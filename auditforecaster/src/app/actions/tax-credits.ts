'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"

export async function createTaxCredit(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    const jobId = formData.get('jobId') as string
    const creditAmount = parseFloat(formData.get('creditAmount') as string)
    const certificationDate = new Date(formData.get('certificationDate') as string)
    const notes = formData.get('notes') as string

    await prisma.taxCredit.create({
        data: {
            jobId,
            creditAmount,
            certificationDate,
            status: 'PENDING',
            notes,
        }
    })

    revalidatePath('/dashboard/finances/tax-credits')
    revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function updateTaxCreditStatus(id: string, status: string) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    await prisma.taxCredit.update({
        where: { id },
        data: { status }
    })

    revalidatePath('/dashboard/finances/tax-credits')
}
