'use client'

import React from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { MapPin, Calendar, User } from 'lucide-react'

interface Photo {
    id: string
    url: string
    caption?: string | null
    category?: string | null
    createdAt: Date
    latitude?: number | null
    longitude?: number | null
    inspection: {
        job: {
            streetAddress: string
            city: string
        }
    }
}

interface ProjectFeedProps {
    photos: Photo[]
}

export function ProjectFeed({ photos }: ProjectFeedProps) {
    // Group photos by date
    const groupedPhotos = photos.reduce((acc, photo) => {
        const dateKey = format(new Date(photo.createdAt), 'yyyy-MM-dd')
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(photo)
        return acc
    }, {} as Record<string, Photo[]>)

    const sortedDates = Object.keys(groupedPhotos).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return (
        <div className="space-y-8">
            {sortedDates.map(date => (
                <div key={date} className="space-y-4">
                    <h3 className="text-lg font-semibold sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
                        {format(new Date(date), 'EEEE, MMMM do, yyyy')}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(groupedPhotos[date] || []).map(photo => (
                            <div key={photo.id} className="group relative aspect-square bg-muted rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-all">
                                <Image
                                    src={photo.url}
                                    alt={photo.caption || 'Project Photo'}
                                    fill
                                    className="object-cover transition-transform group-hover:scale-105"
                                />
                                
                                {/* Overlay Info */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-white text-sm font-medium truncate">
                                        {photo.caption || photo.category || 'Untitled'}
                                    </p>
                                    <div className="flex items-center text-white/80 text-xs mt-1 space-x-2">
                                        {photo.latitude && (
                                            <span className="flex items-center">
                                                <MapPin className="w-3 h-3 mr-1" />
                                                GPS
                                            </span>
                                        )}
                                        <span className="flex items-center">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {format(new Date(photo.createdAt), 'h:mm a')}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Category Badge */}
                                {photo.category && (
                                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full">
                                        {photo.category}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
