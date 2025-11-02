/**
 * Photo compression utilities for bandwidth-aware sync
 * Optimized for field operations on Samsung Galaxy S23 Ultra
 */

interface CompressionOptions {
  quality: 'high' | 'medium' | 'low';
  maxWidth?: number;
  maxHeight?: number;
  preserveMetadata?: boolean;
}

/**
 * Compress image based on network quality and battery status
 */
export async function compressPhoto(
  file: File | Blob,
  options: CompressionOptions
): Promise<Blob> {
  // Quality settings based on compression level
  const qualitySettings = {
    high: { quality: 0.9, maxWidth: 2048, maxHeight: 2048 },
    medium: { quality: 0.7, maxWidth: 1536, maxHeight: 1536 },
    low: { quality: 0.5, maxWidth: 1024, maxHeight: 1024 }
  };
  
  const settings = qualitySettings[options.quality];
  const maxWidth = options.maxWidth || settings.maxWidth;
  const maxHeight = options.maxHeight || settings.maxHeight;
  
  // Create a canvas element for compression
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }
  
  // Create image element
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        settings.quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load image from file/blob
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get compression level based on battery and network status
 */
export function getCompressionLevel(
  batteryLevel: number,
  networkQuality: string,
  isCharging: boolean
): CompressionOptions['quality'] {
  // High quality when charging or good conditions
  if (isCharging || (batteryLevel > 50 && networkQuality === 'excellent')) {
    return 'high';
  }
  
  // Low quality for poor conditions
  if (batteryLevel < 20 || networkQuality === 'poor' || networkQuality === 'offline') {
    return 'low';
  }
  
  // Medium quality for average conditions
  return 'medium';
}

/**
 * Calculate estimated file size after compression
 */
export function estimateCompressedSize(
  originalSize: number,
  compressionLevel: CompressionOptions['quality']
): number {
  const compressionRatios = {
    high: 0.7,    // ~30% reduction
    medium: 0.4,  // ~60% reduction
    low: 0.2      // ~80% reduction
  };
  
  return Math.round(originalSize * compressionRatios[compressionLevel]);
}

/**
 * Batch compress multiple photos
 */
export async function batchCompressPhotos(
  files: File[],
  options: CompressionOptions
): Promise<Blob[]> {
  const compressionPromises = files.map(file => compressPhoto(file, options));
  return Promise.all(compressionPromises);
}

/**
 * Smart compression based on available bandwidth
 */
export async function smartCompress(
  file: File,
  networkSpeed: number // in Mbps
): Promise<Blob> {
  let quality: CompressionOptions['quality'];
  
  if (networkSpeed < 1) {
    quality = 'low';
  } else if (networkSpeed < 5) {
    quality = 'medium';
  } else {
    quality = 'high';
  }
  
  return compressPhoto(file, { quality });
}