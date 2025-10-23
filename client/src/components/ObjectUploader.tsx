import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import Webcam from "@uppy/webcam";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

/**
 * Compress an image file using canvas API
 * @param file - The original file
 * @param maxSizeKB - Target max size in KB (default 500KB)
 * @param quality - JPEG quality 0-1 (default 0.8)
 * @returns Compressed file
 */
async function compressImage(
  file: File,
  maxSizeKB = 500,
  quality = 0.8
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

        // Limit max dimension to 1920px for field photos
        const maxDimension = 1920;
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

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  enableWebcam?: boolean; // Enable direct camera capture (default: true for mobile)
  enableCompression?: boolean; // Enable image compression (default: true)
  compressionQuality?: number; // JPEG quality 0-1 (default: 0.8)
  maxImageSizeKB?: number; // Target max size in KB (default: 500KB)
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management with enhanced mobile camera support and image compression.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Direct camera access (webcam/mobile camera) for instant photo capture
 * - Automatic image compression to reduce bandwidth usage (configurable)
 * - Provides a modal interface for:
 *   - File selection
 *   - Camera capture (take photo, retake, confirm)
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3 uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 * @param props.enableWebcam - Enable direct camera capture (default: true)
 * @param props.enableCompression - Enable automatic image compression (default: true)
 * @param props.compressionQuality - JPEG compression quality 0-1 (default: 0.8)
 * @param props.maxImageSizeKB - Target max size in KB after compression (default: 500KB)
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  enableWebcam = true,
  enableCompression = true,
  compressionQuality = 0.8,
  maxImageSizeKB = 500,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
      });

    // Add webcam plugin for direct camera access
    if (enableWebcam) {
      uppyInstance.use(Webcam, {
        modes: ["picture"], // Only photo mode (no video)
        showRecordingLength: false,
        mirror: false, // Don't mirror the preview
      });
    }

    // Add compression preprocessor if enabled
    if (enableCompression) {
      uppyInstance.on("file-added", async (file) => {
        if (file.type?.startsWith("image/")) {
          try {
            const originalFile = file.data as File;
            const compressedFile = await compressImage(
              originalFile,
              maxImageSizeKB,
              compressionQuality
            );
            
            // Only update metadata if compression actually produced a new JPEG
            // (compressImage returns original file if compression was skipped or failed)
            if (compressedFile !== originalFile && compressedFile.type === "image/jpeg") {
              // Update filename to reflect JPEG conversion (change extension to .jpg)
              const originalName = file.name || "photo";
              const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
              const newName = `${nameWithoutExt}.jpg`;
              
              // Update the file in Uppy with compressed version AND correct metadata
              uppyInstance.setFileState(file.id, {
                data: compressedFile,
                size: compressedFile.size,
                type: "image/jpeg", // Update MIME type to match JPEG format
                name: newName, // Update filename with .jpg extension
                meta: {
                  ...file.meta,
                  name: newName, // Also update meta.name for consistency
                },
              });
            }
            // If compression was skipped (same file returned), leave metadata unchanged
          } catch (error) {
            console.error("Image compression failed:", error);
            // Continue with original file if compression fails
          }
        }
      });
    }

    return uppyInstance;
  });

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} data-testid="button-upload">
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
