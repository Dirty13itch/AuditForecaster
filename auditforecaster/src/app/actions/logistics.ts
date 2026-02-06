'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function getTodaysRoute() {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. Check if a Route already exists for today
    const existingRoute = await prisma.route.findFirst({
        where: {
            driverId: session.user.id,
            date: {
                gte: today,
                lt: tomorrow
            }
        },
        include: {
            stops: {
                include: {
                    job: {
                        include: { subdivision: true }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    })

    if (existingRoute && existingRoute.stops.length > 0) {
        // Return jobs in the saved order
        return existingRoute.stops.map(stop => stop.job).filter(Boolean)
    }

    // 2. Fetch unrouted jobs for today
    const jobs = await prisma.job.findMany({
        where: {
            inspectorId: session.user.id, // Filter by assigned inspector
            scheduledDate: {
                gte: today,
                lt: tomorrow
            },
            status: {
                not: 'COMPLETED'
            }
        },
        take: 100,
        include: {
            subdivision: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    if (jobs.length === 0) return []

    // 3. Optimize Route (Nearest Neighbor)
    // Start at "Office" (Placeholder coords: Austin, TX)
    let currentLocation = { lat: 30.2672, lng: -97.7431 }
    const unvisited = [...jobs]
    const optimizedOrder: typeof jobs = []

    while (unvisited.length > 0) {
        let nearestIndex = -1
        let minDist = Infinity

        for (let i = 0; i < unvisited.length; i++) {
            const job = unvisited[i]
            if (!job) continue
            // Use job coords or default if missing (mock geocoding)
            const jobLat = job.latitude || 30.2672 + (Math.random() * 0.1) // Mock spread
            const jobLng = job.longitude || -97.7431 + (Math.random() * 0.1)

            const dist = getDistance(currentLocation.lat, currentLocation.lng, jobLat, jobLng)
            if (dist < minDist) {
                minDist = dist
                nearestIndex = i
            }
        }

        if (nearestIndex !== -1) {
            const nextJob = unvisited[nearestIndex]
            if (!nextJob) break // Should not happen given index check

            optimizedOrder.push(nextJob)
            // Update current location to this job
            currentLocation = {
                lat: nextJob.latitude || 30.2672,
                lng: nextJob.longitude || -97.7431
            }
            unvisited.splice(nearestIndex, 1)
        } else {
            // Fallback (shouldn't happen)
            optimizedOrder.push(unvisited.shift()!)
        }
    }

    // 4. Save Route to DB
    const route = await prisma.route.create({
        data: {
            date: today,
            driverId: session.user.id,
            status: 'PENDING',
            stops: {
                create: optimizedOrder.map((job, index) => ({
                    order: index + 1,
                    jobId: job.id,
                    status: 'PENDING'
                }))
            }
        }
    })

    return optimizedOrder
}

// Haversine Distance Helper (km)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export async function logTrip(data: {
    vehicleId: string
    date: Date
    distance: number
    startLocation: string
    endLocation: string
    purpose: string
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    await prisma.mileageLog.create({
        data: {
            vehicleId: data.vehicleId,
            date: data.date,
            distance: data.distance,
            startLocation: data.startLocation,
            endLocation: data.endLocation,
            purpose: data.purpose,
            status: 'PENDING'
        }
    })

    return { success: true }
}
