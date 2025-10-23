import { useState } from "react";
import { GalleryPhotoPicker } from "./GalleryPhotoPicker";
import { EnhancedWebCamera } from "./EnhancedWebCamera";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, ImageIcon } from "lucide-react";
import type { Photo } from "@shared/schema";

interface PhotoCaptureProps {
  jobId: string;
  onUploadComplete?: () => void;
  bucketPath?: string;
  showGalleryByDefault?: boolean; // Show gallery picker immediately
  existingPhotos?: Photo[];
}

/**
 * Unified photo capture component offering both gallery selection and in-app camera
 * Primary method: Gallery picker for native camera photos
 * Secondary method: Enhanced web camera for quick in-app capture
 */
export function PhotoCapture({
  jobId,
  onUploadComplete,
  bucketPath = "photos",
  showGalleryByDefault = false,
  existingPhotos = [],
}: PhotoCaptureProps) {
  const [mode, setMode] = useState<"select" | "gallery" | "camera">(
    showGalleryByDefault ? "gallery" : "select"
  );

  const handleUploadComplete = () => {
    onUploadComplete?.();
    if (mode === "camera") {
      // Keep camera open for next photo
    } else if (mode === "gallery") {
      // Keep gallery open - user can add more or close manually
    }
  };

  const handleCameraClose = () => {
    setMode("select");
  };

  if (mode === "gallery") {
    return (
      <div className="space-y-4">
        <GalleryPhotoPicker
          jobId={jobId}
          onUploadComplete={handleUploadComplete}
          bucketPath={bucketPath}
          existingPhotos={existingPhotos}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMode("select")}
          data-testid="button-back-to-options"
        >
          Back to Options
        </Button>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <EnhancedWebCamera
        jobId={jobId}
        onUploadComplete={handleUploadComplete}
        bucketPath={bucketPath}
        onClose={handleCameraClose}
        autoAdvance={true}
        existingPhotos={existingPhotos}
      />
    );
  }

  // Selection mode - show both options
  return (
    <Card className="p-6 space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Add Photos</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you want to add photos to this job
        </p>
      </div>

      <div className="space-y-3">
        {/* Primary: Gallery picker */}
        <Button
          onClick={() => setMode("gallery")}
          className="w-full h-auto py-4"
          size="lg"
          data-testid="button-choose-gallery"
        >
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            <div>
              <div className="font-semibold">Add from Gallery</div>
              <div className="text-xs opacity-90">
                Best quality - Select photos from your camera roll
              </div>
            </div>
          </div>
        </Button>

        {/* Secondary: Quick snap */}
        <Button
          onClick={() => setMode("camera")}
          variant="outline"
          className="w-full h-auto py-4"
          size="lg"
          data-testid="button-choose-camera"
        >
          <div className="flex flex-col items-center gap-2">
            <Camera className="h-6 w-6" />
            <div>
              <div className="font-semibold">Quick Snap</div>
              <div className="text-xs opacity-90">
                Fast and convenient - Take photo now
              </div>
            </div>
          </div>
        </Button>
      </div>

      <div className="text-xs text-center text-muted-foreground">
        All photos automatically link to this job and upload when WiFi is available
      </div>
    </Card>
  );
}
