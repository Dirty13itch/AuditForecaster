'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from "zod"

const JobSchema = z.object({
    builderId: z.string().min(1, "Builder is required"),
    lotNumber: z.string().min(1, "Lot Number is required"),
    streetAddress: z.string().min(1, "Street Address is required"),
    city: z.string().min(1, "City is required"),
    scheduledDate: z.string().optional(),
    inspectorId: z.string().optional(),
})
import { auth } from "@/auth"

import { getCoordinates } from "@/lib/geocoding"

export async function createJob(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    const validatedFields = JobSchema.parse({
        builderId: formData.get('builderId'),
        lotNumber: formData.get('lotNumber'),
        streetAddress: formData.get('streetAddress'),
        city: formData.get('city'),
        scheduledDate: formData.get('scheduledDate') || undefined,
        inspectorId: formData.get('inspectorId') || undefined,
    })

    const fullAddress = `${validatedFields.streetAddress}, ${validatedFields.city}`
    const coords = await getCoordinates(fullAddress)

    try {
        await prisma.job.create({
            data: {
                builderId: validatedFields.builderId,
                lotNumber: validatedFields.lotNumber,
                streetAddress: validatedFields.streetAddress,
                address: fullAddress,
                city: validatedFields.city,
                scheduledDate: validatedFields.scheduledDate ? new Date(validatedFields.scheduledDate) : new Date(),
                status: validatedFields.inspectorId ? 'ASSIGNED' : 'PENDING',
                inspectorId: validatedFields.inspectorId || null,
                latitude: coords?.lat || null,
                longitude: coords?.lng || null,
            }
        })

        revalidatePath('/dashboard/jobs')
        return { success: true, message: 'Job created successfully' }
    } catch (error) {
        console.error('Failed to create job:', error)
        return { success: false, message: 'Failed to create job' }
    }
}

export async function updateJobStatus(id: string, status: string) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    await prisma.job.update({
        where: { id },
        data: { status }
    })
    revalidatePath('/dashboard/jobs')
}

export async function updateJob(formData: FormData) {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")
    const id = formData.get('id') as string
    const status = formData.get('status') as string
    const streetAddress = formData.get('streetAddress') as string
    const city = formData.get('city') as string

    const data: Record<string, unknown> = {}
    if (status) data.status = status
    if (streetAddress) data.streetAddress = streetAddress
    if (city) data.city = city

    if (streetAddress && city) {
        data.address = `${streetAddress}, ${city}`
    }

    await prisma.job.update({
        where: { id },
        data
    })

    revalidatePath('/dashboard/jobs')
    redirect('/dashboard/jobs')
}



export async function getTemplatesForSelection() {
    const session = await auth()
    if (!session) throw new Error("Unauthorized")

    const templates = await prisma.reportTemplate.findMany({
        select: {
            id: true,
            name: true,
            description: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    return templates
}
