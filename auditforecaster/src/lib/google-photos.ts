import { getGoogleClient } from './google'

const PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1'

export async function createAlbum(title: string) {
    const client = await getGoogleClient()
    const token = await client.getAccessToken()

    if (!token.token) throw new Error('No access token')

    const response = await fetch(`${PHOTOS_API_BASE}/albums`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            album: { title }
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to create album: ${response.statusText}`)
    }

    const data = await response.json()
    return {
        id: data.id,
        productUrl: data.productUrl
    }
}

export async function uploadPhotoToGoogle(albumId: string, photo: string | Buffer, description?: string, filename: string = 'photo.jpg') {
    const client = await getGoogleClient()
    const token = await client.getAccessToken()

    if (!token.token) throw new Error('No access token')

    let imageBuffer: ArrayBuffer | Buffer

    if (typeof photo === 'string') {
        // 1. Fetch image bytes from URL
        const imageResponse = await fetch(photo)
        imageBuffer = await imageResponse.arrayBuffer()
        if (filename === 'photo.jpg') {
            filename = photo.split('/').pop() || 'photo.jpg'
        }
    } else {
        // Use provided buffer
        imageBuffer = photo
    }

    // 2. Upload bytes to get uploadToken
    const uploadResponse = await fetch(`${PHOTOS_API_BASE}/uploads`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/octet-stream',
            'X-Goog-Upload-Protocol': 'raw',
        },
        body: imageBuffer as any
    })

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload bytes: ${uploadResponse.statusText}`)
    }

    const uploadToken = await uploadResponse.text()

    // 3. Create Media Item
    const createResponse = await fetch(`${PHOTOS_API_BASE}/mediaItems:batchCreate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            albumId,
            newMediaItems: [
                {
                    description: description || '',
                    simpleMediaItem: {
                        uploadToken,
                        fileName: filename
                    }
                }
            ]
        })
    })

    if (!createResponse.ok) {
        throw new Error(`Failed to create media item: ${createResponse.statusText}`)
    }

    return await createResponse.json()
}
