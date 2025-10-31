import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface OcrResult {
  amount?: number;
  vendor?: string;
  date?: string;
  confidence: number;
  rawText: string;
}

interface ReceiptUploadProps {
  value?: string;
  onChange: (receiptUrl: string | null) => void;
  onOcrComplete?: (ocrData: OcrResult) => void;
  disabled?: boolean;
}

export function ReceiptUpload({ value, onChange, onOcrComplete, disabled }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Max dimensions
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Could not compress image'));
              }
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.onerror = () => reject(new Error('Could not load image'));
      };
      reader.onerror = () => reject(new Error('Could not read file'));
    });
  };

  // Parse OCR text to extract receipt data
  const parseReceiptData = (text: string): { amount?: number; vendor?: string; date?: string } => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract amount - look for currency patterns: $XX.XX or XX.XX
    let amount: number | undefined;
    const amountRegex = /\$?\s*(\d+[.,]\d{2})\b/g;
    const amounts: number[] = [];
    let match;
    while ((match = amountRegex.exec(text)) !== null) {
      const parsedAmount = parseFloat(match[1].replace(',', '.'));
      if (parsedAmount > 0) {
        amounts.push(parsedAmount);
      }
    }
    // Use the largest amount as it's likely the total
    if (amounts.length > 0) {
      amount = Math.max(...amounts);
    }

    // Extract vendor - use first non-empty line as vendor name
    const vendor = lines.length > 0 ? lines[0].substring(0, 100) : undefined;

    // Extract date - look for common date patterns
    let date: string | undefined;
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // MM/DD/YYYY or MM-DD-YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,    // YYYY/MM/DD or YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch) {
        date = dateMatch[0];
        break;
      }
    }

    return { amount, vendor, date };
  };

  // Process OCR on receipt image
  const processOcr = async (blob: Blob): Promise<OcrResult> => {
    try {
      // Lazy load tesseract.js to minimize bundle size
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(blob);
      await worker.terminate();

      const parsedData = parseReceiptData(data.text);
      
      return {
        rawText: data.text,
        confidence: data.confidence,
        ...parsedData,
      };
    } catch (error) {
      throw error;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, HEIC)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Compress image
      const compressedBlob = await compressImage(file);

      // Get upload URL from server
      const { uploadURL, objectPath } = await apiRequest<{
        uploadURL: string;
        objectPath: string;
      }>("/api/objects/upload", { method: "POST" });

      // Upload compressed image to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: compressedBlob,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Set preview and notify parent
      const preview = URL.createObjectURL(compressedBlob);
      setPreviewUrl(preview);
      onChange(objectPath);

      toast({
        title: "Receipt uploaded",
        description: "Receipt photo uploaded successfully",
      });

      // Process OCR if callback provided
      if (onOcrComplete) {
        setProcessing(true);
        toast({
          title: "Processing receipt",
          description: "Extracting text from receipt...",
        });

        try {
          const ocrResult = await processOcr(compressedBlob);
          onOcrComplete(ocrResult);
          
          toast({
            title: "Receipt processed",
            description: `Extracted data with ${Math.round(ocrResult.confidence)}% confidence`,
          });
        } catch (ocrError) {
          toast({
            title: "OCR processing failed",
            description: "Could not extract text from receipt. You can enter data manually.",
            variant: "destructive",
          });
        } finally {
          setProcessing(false);
        }
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload receipt",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      // Mobile devices will show camera option when capture="environment" is set
      fileInputRef.current.click();
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3" data-testid="receipt-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        data-testid="input-receipt-file"
      />

      {previewUrl || value ? (
        <div className="relative">
          <img
            src={previewUrl || `/objects/${value?.replace('/objects/', '')}`}
            alt="Receipt preview"
            className="w-full h-48 object-cover rounded-md border"
            data-testid="img-receipt-preview"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled || uploading}
            data-testid="button-remove-receipt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraClick}
            disabled={disabled || uploading}
            data-testid="button-take-photo"
            className="flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleFileClick}
            disabled={disabled || uploading}
            data-testid="button-choose-file"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Choose File
          </Button>
        </div>
      )}

      {(uploading || processing) && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" data-testid="text-status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {uploading && "Uploading receipt..."}
          {processing && <><Scan className="h-4 w-4" /> Processing receipt text...</>}
        </div>
      )}
    </div>
  );
}
