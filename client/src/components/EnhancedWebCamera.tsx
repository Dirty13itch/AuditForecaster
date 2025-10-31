import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, X, RotateCw, Zap, ZapOff, Loader2, AlertTriangle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { addToSyncQueue } from "@/lib/syncQueue";
import { clientLogger } from "@/lib/logger";
import { generateHash } from "@/lib/utils";
import type { Photo } from "@shared/schema";

/**
 * Compress an image file using canvas API
 */
async function compressImage(
  file: File,
  maxSizeKB = 1000,
  quality = 0.92
): Promise<File> {
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
              resolve(file);
            } else {
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

interface EnhancedWebCameraProps {
  jobId: string;
  onUploadComplete?: () => void;
  bucketPath?: string;
  onClose?: () => void;
  autoAdvance?: boolean; // Auto-advance to next photo after capture
  existingPhotos?: Photo[];
}

/**
 * Enhanced web camera component using ImageCapture API
 * Provides maximum quality for in-app photo capture with manual controls
 */
export function EnhancedWebCamera({
  jobId,
  onUploadComplete,
  bucketPath = "photos",
  onClose,
  autoAdvance = true,
  existingPhotos = [],
}: EnhancedWebCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasFlash, setHasFlash] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [zoom, setZoom] = useState([1]);
  const [maxZoom, setMaxZoom] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedFilename, setCapturedFilename] = useState<string | null>(null);
  const [capturedHash, setCapturedHash] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const { toast } = useToast();

  // Extract hashes from existing photos for content-based duplicate detection
  const existingHashes = new Set(
    existingPhotos
      .filter(photo => photo.hash) // Only consider photos with hashes
      .map(photo => photo.hash!)
  );

  // Initialize camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 4096 },
          height: { ideal: 3072 },
          aspectRatio: { ideal: 4/3 },
          frameRate: { ideal: 30 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Initialize ImageCapture API
      const videoTrack = mediaStream.getVideoTracks()[0];
      const capture = new ImageCapture(videoTrack);
      setImageCapture(capture);

      // Get capabilities to check for flash and zoom
      const capabilities = videoTrack.getCapabilities();
      
      // Check for flash/torch
      if ('torch' in capabilities) {
        setHasFlash(true);
      }

      // Check for zoom
      if (capabilities.zoom) {
        setMaxZoom(capabilities.zoom.max || 1);
      }

      // Get actual resolution
      const settings = videoTrack.getSettings();
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take photos",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleZoomChange = async (value: number[]) => {
    setZoom(value);
    if (stream && imageCapture) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          // @ts-ignore - zoom is not in TypeScript definitions yet
          advanced: [{ zoom: value[0] }]
        });
      } catch (error) {
        // Zoom not supported on this device
      }
    }
  };

  const toggleFlash = async () => {
    if (stream && hasFlash) {
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          // @ts-ignore - torch is not in TypeScript definitions yet
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      } catch (error) {
        // Flash not supported on this device
      }
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const capturePhoto = async () => {
    if (!imageCapture) return;

    setIsCapturing(true);

    try {
      // Use takePhoto for highest quality
      const blob = await imageCapture.takePhoto({
        imageWidth: 4096,
        imageHeight: 3072,
      });

      // Generate filename
      const filename = `photo-${Date.now()}.jpg`;
      
      // Compute hash for content-based duplicate detection
      const hash = await generateHash(blob);
      const duplicate = existingHashes.has(hash);
      
      setCapturedBlob(blob);
      setCapturedFilename(filename);
      setCapturedHash(hash);
      setIsDuplicate(duplicate);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);

      if (duplicate) {
        toast({
          title: "Duplicate photo detected",
          description: "This photo appears to be identical to an existing photo. You can still proceed if you want.",
          variant: "default",
        });
      }

      // Auto-upload if enabled (even if duplicate, user can decide)
      if (autoAdvance && !duplicate) {
        setTimeout(() => {
          uploadPhoto(blob, filename, hash);
        }, 500); // Brief preview
      }
    } catch (error) {
      clientLogger.error("Capture error:", error);
      toast({
        title: "Capture failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const uploadPhoto = async (blob?: Blob, filename?: string, hash?: string) => {
    const photoBlob = blob || capturedBlob;
    const photoFilename = filename || capturedFilename || `photo-${Date.now()}.jpg`;
    const photoHash = hash || capturedHash;
    if (!photoBlob) return;

    try {
      // Convert blob to file
      const file = new File([photoBlob], photoFilename, {
        type: "image/jpeg",
      });

      // Compress
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
        throw new Error("Failed to upload photo");
      }

      // Extract file path
      const urlObj = new URL(url);
      const filePath = urlObj.pathname.split('/').slice(2).join('/');

      // Save photo metadata to database - with offline queue support
      const photoData = {
        jobId,
        filePath,
        caption: "",
        tags: [],
        hash: photoHash,
      };

      let photoSaved = false;
      let photoQueued = false;

      try {
        const photoResponse = await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(photoData),
          credentials: "include",
        });

        if (!photoResponse.ok) {
          throw new Error("Failed to save photo metadata");
        }

        photoSaved = true;
      } catch (error) {
        // Check if it's a network error
        if (!navigator.onLine || (error instanceof Error && error.message.includes('Failed to fetch'))) {
          // Queue the metadata POST for when we're back online
          clientLogger.info('Network offline, queueing photo metadata for sync', { filePath, jobId });
          await addToSyncQueue({
            method: "POST",
            url: "/api/photos",
            data: photoData,
            headers: { "Content-Type": "application/json" },
          });
          photoQueued = true;
        } else {
          // Re-throw non-network errors
          throw error;
        }
      }

      // Success feedback
      if (!autoAdvance) {
        if (photoSaved) {
          toast({
            title: "Success",
            description: "Photo uploaded successfully",
          });
        } else if (photoQueued) {
          toast({
            title: "Photo queued",
            description: "Photo queued for upload when online",
          });
        }
      }

      // Reset for next photo
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setCapturedBlob(null);
      setPreviewUrl(null);
      setShowPreview(false);

      onUploadComplete?.();
    } catch (error) {
      clientLogger.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  const retakePhoto = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedBlob(null);
    setCapturedFilename(null);
    setCapturedHash(null);
    setPreviewUrl(null);
    setShowPreview(false);
    setIsDuplicate(false);
  };

  return (
    <Card className="relative w-full max-w-2xl mx-auto overflow-hidden">
      {/* Camera view */}
      {!showPreview ? (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[4/3] bg-black object-cover"
            data-testid="video-camera-preview"
          />

          {/* Top controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="bg-background/80 backdrop-blur-sm"
              data-testid="button-close-camera"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              {hasFlash && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFlash}
                  className="bg-background/80 backdrop-blur-sm"
                  data-testid="button-toggle-flash"
                >
                  {flashEnabled ? (
                    <Zap className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <ZapOff className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={flipCamera}
                className="bg-background/80 backdrop-blur-sm"
                data-testid="button-flip-camera"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Zoom control */}
          {maxZoom > 1 && (
            <div className="absolute bottom-24 left-4 right-4">
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">1x</span>
                  <Slider
                    value={zoom}
                    onValueChange={handleZoomChange}
                    min={1}
                    max={maxZoom}
                    step={0.1}
                    className="flex-1"
                    data-testid="slider-zoom"
                  />
                  <span className="text-xs font-medium">{maxZoom.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          )}

          {/* Capture button */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <Button
              size="icon"
              onClick={capturePhoto}
              disabled={isCapturing}
              className="h-16 w-16 rounded-full"
              data-testid="button-capture-photo"
            >
              {isCapturing ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Camera className="h-8 w-8" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Preview view
        <div className="relative">
          <img
            src={previewUrl || ""}
            alt={`Captured photo preview${capturedFilename ? ` - ${capturedFilename}` : ''}${isDuplicate ? ' (duplicate filename detected)' : ', ready for upload'}`}
            className="w-full aspect-[4/3] object-cover"
            data-testid="img-photo-preview"
          />

          {/* Duplicate indicator */}
          {isDuplicate && (
            <Badge
              variant="destructive"
              className="absolute top-4 left-4"
              data-testid="badge-duplicate-warning"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Duplicate filename detected
            </Badge>
          )}

          {/* Preview controls */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={retakePhoto}
              data-testid="button-retake"
            >
              Retake
            </Button>
            <Button
              className="flex-1"
              onClick={() => uploadPhoto()}
              data-testid="button-confirm-upload"
            >
              {isDuplicate ? "Upload Anyway" : "Use Photo"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
