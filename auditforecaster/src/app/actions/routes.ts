'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

// Simple distance calculation (Haversine formula)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export async function generateDailyRoute(driverId: string, date: Date) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    // 1. Fetch jobs for this driver on this date
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const jobs = await prisma.job.findMany({
        where: {
            inspectorId: driverId,
            scheduledDate: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: { not: 'CANCELED' }
        }
    })

    if (jobs.length === 0) {
        return { success: false, message: "No jobs found for this date." }
    }

    // 2. Optimize Order (Nearest Neighbor)
    // Starting point: Let's assume office or first job? 
    // For MVP, let's just sort by latitude (North to South) as a naive heuristic if no start point.
    // Better: Pick the job with earliest start time if we had times, but we only have date.
    // Let's use a simple greedy algorithm starting from the northernmost point.

    const unvisited = [...jobs]
    const sortedJobs = []

    // Start with the northernmost job (highest latitude)
    unvisited.sort((a, b) => (b.latitude || 0) - (a.latitude || 0))
    let current = unvisited.shift()
    if (current) sortedJobs.push(current)

    while (unvisited.length > 0 && current) {
        // Find nearest neighbor
        let nearestIdx = -1
        let minDist = Infinity

        for (let i = 0; i < unvisited.length; i++) {
            const job = unvisited[i]
            if (!job) continue

            if (current.latitude && current.longitude && job.latitude && job.longitude) {
                const dist = getDistanceFromLatLonInKm(current.latitude, current.longitude, job.latitude, job.longitude)
                if (dist < minDist) {
                    minDist = dist
                    nearestIdx = i
                }
            } else {
                // Fallback if no coords
                minDist = 0
                nearestIdx = i
            }
        }

        if (nearestIdx !== -1) {
            const next = unvisited.splice(nearestIdx, 1)[0]
            if (next) {
                current = next
                sortedJobs.push(current)
            } else {
                break
            }
        } else {
            // Should not happen unless unvisited is empty
            break
        }
    }

    // 3. Create Route
    const route = await prisma.route.create({
        data: {
            driverId,
            date: startOfDay,
            status: 'PENDING',
            stops: {
                create: sortedJobs.map((job, index) => ({
                    jobId: job.id,
                    order: index + 1,
                    status: 'PENDING'
                }))
            }
        }
    })

    revalidatePath('/dashboard/logistics/routes')
    return { success: true, routeId: route.id }
}

export async function getRoutes(date?: Date) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const where: Prisma.RouteWhereInput = {}
    if (date) {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)
        where.date = { gte: start, lte: end }
    }

    // If inspector, only show their routes
    if (session.user.role === 'INSPECTOR') {
        where.driverId = session.user.id
    }

    return prisma.route.findMany({
        where,
        take: 50,
        include: {
            driver: { select: { name: true, email: true } },
            stops: { include: { job: true }, orderBy: { order: 'asc' } }
        },
        orderBy: { date: 'desc' }
    })
}

export async function getRouteDetails(id: string) {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    return prisma.route.findUnique({
        where: { id },
        include: {
            driver: { select: { name: true, email: true } },
            stops: {
                include: { job: true },
                orderBy: { order: 'asc' }
            }
        }
    })
}
