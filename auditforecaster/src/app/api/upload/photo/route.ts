import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import exifr from 'exifr'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const inspectionId = formData.get('inspectionId') as string
        const caption = formData.get('caption') as string | null
        const category = formData.get('category') as string | null

        if (!file || !inspectionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Validate inspectionId format (UUID only - prevents path traversal)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(inspectionId)) {
            return NextResponse.json({ error: 'Invalid inspection ID format' }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP allowed.' }, { status: 400 })
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
        }

        // Create upload directory if it doesn't exist
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'photos', inspectionId)
        await mkdir(uploadDir, { recursive: true })

        // Generate unique filename
        const timestamp = Date.now()
        const extension = file.name.split('.').pop()
        const filename = `${timestamp}.${extension}`
        const filepath = join(uploadDir, filename)

        // Convert file to buffer and write
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Extract EXIF Data
        let latitude: number | undefined
        let longitude: number | undefined
        let takenAt: Date | undefined

        try {
            const exif = await exifr.parse(buffer)
            if (exif) {
                latitude = exif.latitude
                longitude = exif.longitude
                takenAt = exif.DateTimeOriginal || exif.CreateDate
            }
        } catch (e) {
            logger.warn('Failed to extract EXIF', { error: e })
        }

        // Create database record
        const photo = await prisma.photo.create({
            data: {
                url: `/uploads/photos/${inspectionId}/${filename}`,
                caption: caption || null,
                category: category || null,
                inspectionId,
                latitude,
                longitude,
                takenAt,
            }
        })

        // Google Photos Backup (CompanyCam Feature)
        try {
            const { createAlbum, uploadPhotoToGoogle } = await import('@/lib/google-photos')

            // Get Job details
            const inspection = await prisma.inspection.findUnique({
                where: { id: inspectionId },
                include: { job: true }
            })

            if (inspection?.job) {
                let albumId = inspection.job.googleAlbumId

                // Create Album if missing
                if (!albumId) {
                    const title = `${inspection.job.lotNumber} - ${inspection.job.streetAddress}`
                    const album = await createAlbum(title)
                    albumId = album.id

                    await prisma.job.update({
                        where: { id: inspection.job.id },
                        data: {
                            googleAlbumId: album.id,
                            googleAlbumUrl: album.productUrl
                        }
                    })
                }

                // Upload to Google using buffer
                await uploadPhotoToGoogle(albumId!, buffer, caption || undefined, filename)
            }
        } catch (e) {
            logger.error('Google Photos Backup failed', { error: e })
            // Don't fail the request, just log it
        }

        return NextResponse.json({
            success: true,
            photo: {
                id: photo.id,
                url: photo.url,
                caption: photo.caption,
                category: photo.category,
                latitude: photo.latitude,
                longitude: photo.longitude,
                takenAt: photo.takenAt,
            }
        })

    } catch (error) {
        logger.error('Upload error', { error })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Check authentication
        const session = await auth()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const photoId = searchParams.get('id')

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
        }

        // Get photo with ownership chain for authorization
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: {
                inspection: {
                    include: {
                        job: {
                            select: {
                                inspectorId: true,
                                builderId: true
                            }
                        }
                    }
                }
            }
        })

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
        }

        // Verify ownership: user must be admin, the inspector who took it, or the builder
        const isAdmin = session.user?.role === 'ADMIN'
        const isInspector = photo.inspection?.job?.inspectorId === session.user?.id
        const isBuilder = session.user?.builderId && photo.inspection?.job?.builderId === session.user?.builderId

        if (!isAdmin && !isInspector && !isBuilder) {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this photo' }, { status: 403 })
        }

        // Delete from database
        await prisma.photo.delete({
            where: { id: photoId }
        })

        // Optionally delete file from disk
        // const filepath = join(process.cwd(), 'public', photo.url)
        // await unlink(filepath).catch(() => {}) // Ignore errors if file doesn't exist

        return NextResponse.json({ success: true })

    } catch (error) {
        logger.error('Delete error', { error })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        )
    }
}
