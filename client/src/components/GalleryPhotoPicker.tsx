import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Check, ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Compress an image file using canvas API
 * @param file - The original file
 * @param maxSizeKB - Target max size in KB (default 1000KB for gallery photos)
 * @param quality - JPEG quality 0-1 (default 0.92 for high quality)
 * @returns Compressed file
 */
async function compressImage(
  file: File,
  maxSizeKB = 1000,
  quality = 0.92
): Promise<File> {
  // Skip compression for non-images or small files
  if (!file.type.startsWith("image/") || file.size < maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Limit max dimension to 2560px for high-quality native camera photos
        const maxDimension = 2560;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size > file.size) {
              // If compression failed or made file larger, use original
              resolve(file);
            } else {
              // Update filename to reflect JPEG conversion
              const originalName = file.name;
              const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
              const newName = `${nameWithoutExt}.jpg`;
              
              const compressedFile = new File([blob], newName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface SelectedPhoto {
  file: File;
  preview: string;
}

interface GalleryPhotoPickerProps {
  jobId: string;
  onUploadComplete?: () => void;
  bucketPath?: string;
  maxPhotos?: number;
}

/**
 * Gallery photo picker component for selecting photos from device gallery/camera roll
 * Optimized for batch selection of native camera photos with smart compression
 */
export function GalleryPhotoPicker({
  jobId,
  onUploadComplete,
  bucketPath = "photos",
  maxPhotos = 50,
}: GalleryPhotoPickerProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    // Check max limit
    if (selectedPhotos.length + files.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `Maximum ${maxPhotos} photos allowed. You selected ${files.length} but only have ${maxPhotos - selectedPhotos.length} slots remaining.`,
        variant: "destructive",
      });
      return;
    }

    // Create preview URLs for selected files
    const newPhotos: SelectedPhoto[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview); // Clean up memory
      updated.splice(index, 1);
      return updated;
    });
  };

  const clearAll = () => {
    selectedPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
    setSelectedPhotos([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhotos = async () => {
    if (selectedPhotos.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalPhotos = selectedPhotos.length;
      let uploadedCount = 0;

      // Upload photos sequentially to avoid overwhelming the server
      for (const { file } of selectedPhotos) {
        // Compress image
        const compressedFile = await compressImage(file);

        // Get presigned URL
        const urlResponse = await fetch("/api/uploads/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: bucketPath }),
          credentials: "include",
        });

        if (!urlResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { url, method } = await urlResponse.json();

        // Upload to object storage
        const uploadResponse = await fetch(url, {
          method,
          body: compressedFile,
          headers: {
            "Content-Type": compressedFile.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload photo: ${file.name}`);
        }

        // Extract the file path from the presigned URL
        const urlObj = new URL(url);
        const filePath = urlObj.pathname.split('/').slice(2).join('/'); // Remove bucket prefix

        // Save photo metadata to database
        const photoResponse = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId,
            filePath,
            caption: "",
            tags: [],
          }),
          credentials: "include",
        });

        if (!photoResponse.ok) {
          throw new Error(`Failed to save photo metadata: ${file.name}`);
        }

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalPhotos) * 100));
      }

      // Success!
      toast({
        title: "Success",
        description: `${totalPhotos} photo${totalPhotos > 1 ? 's' : ''} uploaded successfully`,
      });

      // Clean up
      clearAll();
      onUploadComplete?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-gallery-picker"
      />

      {/* Primary button */}
      {selectedPhotos.length === 0 ? (
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          size="lg"
          data-testid="button-select-gallery"
        >
          <ImageIcon className="mr-2 h-5 w-5" />
          Add Photos from Gallery
        </Button>
      ) : (
        <Card className="p-4 space-y-4">
          {/* Preview grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                Selected Photos ({selectedPhotos.length})
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={isUploading}
                data-testid="button-clear-all"
              >
                Clear All
              </Button>
            </div>

            <ScrollArea className="h-64 w-full rounded-md border">
              <div className="grid grid-cols-3 gap-2 p-2">
                {selectedPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden group"
                  >
                    <img
                      src={photo.preview}
                      alt={`Selected ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      disabled={isUploading}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      data-testid={`button-remove-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
              disabled={isUploading || selectedPhotos.length >= maxPhotos}
              data-testid="button-add-more"
            >
              Add More
            </Button>
            <Button
              onClick={uploadPhotos}
              className="flex-1"
              disabled={isUploading}
              data-testid="button-upload-selected"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {uploadProgress}%
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Upload {selectedPhotos.length} Photo{selectedPhotos.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
