'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ProjectFeed } from '@/components/jobs/project-feed'
import { PhotoEditor } from '@/components/ui/photo-editor'
import { uploadPhoto } from '@/app/actions/photos'
import { Camera, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface JobPhotosProps {
    jobId: string
    inspectionId?: string
    photos: any[]
}

export function JobPhotos({ jobId, inspectionId, photos }: JobPhotosProps) {
    const [open, setOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const router = useRouter()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleSave = async (editedFile: File) => {
        if (!inspectionId) {
            toast.error('No active inspection found for this job')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', editedFile)
            formData.append('inspectionId', inspectionId)
            formData.append('caption', 'Site Photo')
            formData.append('category', 'General')
            
            // Mock GPS for now (or get from browser)
            formData.append('latitude', '30.2672')
            formData.append('longitude', '-97.7431')

            const result = await uploadPhoto(formData)
            
            if (result.success) {
                toast.success('Photo uploaded')
                setOpen(false)
                setSelectedFile(null)
                router.refresh()
            } else {
                toast.error('Failed to upload photo')
            }
        } catch (error) {
            console.error(error)
            toast.error('Error uploading photo')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Project Photos</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Camera className="mr-2 h-4 w-4" />
                            Add Photo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Add Photo</DialogTitle>
                        </DialogHeader>
                        
                        {!selectedFile ? (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground mb-4">Select a photo to upload and annotate</p>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileSelect}
                                    className="hidden" 
                                    id="photo-upload"
                                />
                                <Button asChild>
                                    <label htmlFor="photo-upload" className="cursor-pointer">
                                        Select File
                                    </label>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0">
                                <PhotoEditor 
                                    imageFile={selectedFile} 
                                    onSave={handleSave}
                                    onCancel={() => setSelectedFile(null)}
                                />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <ProjectFeed photos={photos} />
        </div>
    )
}
