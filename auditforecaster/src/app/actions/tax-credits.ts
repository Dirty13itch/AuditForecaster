'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { auth } from "@/auth"
import { safeParseFloat } from "@/lib/utils"

export async function createTaxCredit(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const jobId = formData.get('jobId') as string
    const creditAmountStr = formData.get('creditAmount') as string
    const certificationDateStr = formData.get('certificationDate') as string
    const notes = formData.get('notes') as string

    // Validate required fields
    if (!jobId || !creditAmountStr || !certificationDateStr) {
        throw new Error("Missing required fields")
    }

    const creditAmount = safeParseFloat(creditAmountStr, 0)
    if (creditAmount <= 0) {
        throw new Error("Invalid credit amount")
    }

    const certificationDate = new Date(certificationDateStr)
    if (isNaN(certificationDate.getTime())) {
        throw new Error("Invalid certification date")
    }

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
