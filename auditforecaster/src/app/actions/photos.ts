'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function uploadPhoto(formData: FormData) {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    const inspectionId = formData.get('inspectionId') as string
    const caption = formData.get('caption') as string
    const category = formData.get('category') as string
    const offlineId = formData.get('id') as string // Original offline ID

    if (!file || !inspectionId) {
        return { error: 'Missing file or inspection ID' }
    }

    // Validate file type: only allow image types
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.' }
    }

    // Validate file size: max 10MB
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
        return { error: 'File too large. Maximum size is 10MB.' }
    }

    // Validate inspectionId format (CUID: starts with 'c', alphanumeric, 20-30 chars)
    if (!/^c[a-z0-9]{19,29}$/i.test(inspectionId)) {
        return { error: 'Invalid inspection ID format' }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure uploads directory exists
        const uploadDir = join(process.cwd(), 'public', 'uploads')
        await mkdir(uploadDir, { recursive: true })

        // Generate unique filename (strip periods to prevent extension spoofing)
        const filename = `${inspectionId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '')}`
        const filepath = join(uploadDir, filename)

        // Write file
        await writeFile(filepath, buffer)
        const publicUrl = `/uploads/${filename}`

        // Save to DB
        await prisma.photo.create({
            data: {
                url: publicUrl,
                caption: caption || '',
                category: category || 'General',
                inspectionId: inspectionId,
                // We could add metadata here if we parsed EXIF
            }
        })
        
        return { success: true, url: publicUrl, offlineId }
    } catch (error) {
        logger.error('Photo upload error', { error })
        return { error: 'Failed to upload photo' }
    }
}
