'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { toast } from 'sonner'

export type Photo = {
    id: string
    url: string
    caption?: string | null
    category?: string | null
}

type PhotoUploadProps = {
    inspectionId: string
    existingPhotos?: Photo[]
    onChange?: (photos: Photo[]) => void
}

export function PhotoUpload({ inspectionId, existingPhotos = [], onChange }: PhotoUploadProps) {
    const [photos, setPhotos] = useState<Photo[]>(existingPhotos)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        setUploading(true)
        const totalFiles = files.length
        let completed = 0

        try {
            const uploadedPhotos: Photo[] = []

            for (const file of Array.from(files)) {
                try {
                    // Compress image
                    const options = {
                        maxSizeMB: 0.5, // 500KB max
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                        fileType: 'image/jpeg' as const,
                    }

                    toast.loading(`Compressing ${file.name}...`)
                    const compressedFile = await imageCompression(file, options)
                    toast.dismiss()

                    // Upload to server
                    const formData = new FormData()
                    formData.append('file', compressedFile)
                    formData.append('inspectionId', inspectionId)

                    toast.loading(`Uploading ${file.name}...`)
                    const response = await fetch('/api/upload/photo', {
                        method: 'POST',
                        body: formData,
                    })

                    toast.dismiss()

                    if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || 'Upload failed')
                    }

                    const data = await response.json()
                    uploadedPhotos.push(data.photo)

                    completed++
                    setUploadProgress(Math.round((completed / totalFiles) * 100))
                    toast.success(`Uploaded ${file.name}`)

                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error)
                    toast.error(`Failed to upload ${file.name}`)
                }
            }

            // Update state with new photos
            const newPhotos = [...photos, ...uploadedPhotos]
            setPhotos(newPhotos)
            onChange?.(newPhotos)

        } finally {
            setUploading(false)
            setUploadProgress(0)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleDelete = async (photoId: string) => {
        try {
            const response = await fetch(`/api/upload/photo?id=${photoId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Delete failed')
            }

            const newPhotos = photos.filter(p => p.id !== photoId)
            setPhotos(newPhotos)
            onChange?.(newPhotos)
            toast.success('Photo deleted')

        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete photo')
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        handleFileSelect(e.dataTransfer.files)
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="photo-upload"
                />

                {uploading ? (
                    <div className="space-y-3">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <Camera className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 mb-2">
                            Drag and drop photos here, or click to select
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Select Photos
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                            Images will be compressed to ~500KB automatically
                        </p>
                    </>
                )}
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <div key={photo.id} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <Image
                                    src={photo.url}
                                    alt={photo.caption || 'Inspection photo'}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDelete(photo.id)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                aria-label="Delete photo"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            {photo.caption && (
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                    {photo.caption}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {photos.length > 0 && (
                <p className="text-sm text-gray-500">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
                </p>
            )}
        </div >
    )
}
