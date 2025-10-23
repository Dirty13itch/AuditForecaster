import { useState, useEffect, useRef } from "react";
import { createWorker } from "tesseract.js";
import { Copy, ScanText, Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { clientLogger } from "@/lib/logger";

interface PhotoOCRProps {
  open: boolean;
  photoUrl: string;
  jobId?: string;
  onClose: () => void;
  onAutoFill?: (data: { address?: string; lotNumber?: string }) => void;
}

interface RecognizedPattern {
  type: "address" | "lot" | "permit" | "builder";
  value: string;
  confidence: number;
}

export function PhotoOCR({ open, photoUrl, jobId, onClose, onAutoFill }: PhotoOCRProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [recognizedPatterns, setRecognizedPatterns] = useState<RecognizedPattern[]>([]);
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [autoFillData, setAutoFillData] = useState<{ address?: string; lotNumber?: string }>({});
  const workerRef = useRef<Tesseract.Worker | null>(null);

  useEffect(() => {
    if (open && photoUrl) {
      performOCR();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [open, photoUrl]);

  const performOCR = async () => {
    setIsProcessing(true);
    setProgress(0);
    setExtractedText("");
    setEditedText("");
    setConfidence(null);
    setRecognizedPatterns([]);

    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      workerRef.current = worker;

      const { data } = await worker.recognize(photoUrl);
      
      const text = data.text.trim();
      const avgConfidence = data.confidence;

      setExtractedText(text);
      setEditedText(text);
      setConfidence(avgConfidence);

      const patterns = parseTextPatterns(text);
      setRecognizedPatterns(patterns);

      toast({
        title: "OCR Complete",
        description: `Text extracted successfully (${Math.round(avgConfidence)}% confidence)`,
      });

      await worker.terminate();
      workerRef.current = null;
    } catch (error) {
      clientLogger.error("OCR Error:", error);
      toast({
        title: "OCR Failed",
        description: "Failed to extract text from photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const parseTextPatterns = (text: string): RecognizedPattern[] => {
    const patterns: RecognizedPattern[] = [];

    const addressRegex = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|circle|cir|place|pl)[,\s]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi;
    const addressMatches = text.match(addressRegex);
    if (addressMatches) {
      addressMatches.forEach((match) => {
        patterns.push({
          type: "address",
          value: match.trim(),
          confidence: 80,
        });
      });
    }

    const simpleAddressRegex = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct))/gi;
    const simpleAddressMatches = text.match(simpleAddressRegex);
    if (simpleAddressMatches && !addressMatches) {
      simpleAddressMatches.slice(0, 2).forEach((match) => {
        patterns.push({
          type: "address",
          value: match.trim(),
          confidence: 60,
        });
      });
    }

    const lotRegex = /(?:lot|LOT)[:\s#]*(\d+[A-Z]?)/gi;
    const lotMatches = Array.from(text.matchAll(lotRegex));
    lotMatches.forEach((match) => {
      patterns.push({
        type: "lot",
        value: match[1],
        confidence: 85,
      });
    });

    const permitRegex = /(?:permit|PERMIT)[:\s#]*([A-Z0-9-]+)/gi;
    const permitMatches = Array.from(text.matchAll(permitRegex));
    permitMatches.forEach((match) => {
      patterns.push({
        type: "permit",
        value: match[1],
        confidence: 75,
      });
    });

    const builderRegex = /(?:builder|BUILDER|contractor|CONTRACTOR)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const builderMatches = Array.from(text.matchAll(builderRegex));
    builderMatches.forEach((match) => {
      patterns.push({
        type: "builder",
        value: match[1],
        confidence: 70,
      });
    });

    return patterns;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleAutoFill = () => {
    const addressPattern = recognizedPatterns.find(p => p.type === "address");
    const lotPattern = recognizedPatterns.find(p => p.type === "lot");

    if (!addressPattern && !lotPattern) {
      toast({
        title: "No Patterns Found",
        description: "No address or lot number patterns detected in the text",
        variant: "destructive",
      });
      return;
    }

    setAutoFillData({
      address: addressPattern?.value,
      lotNumber: lotPattern?.value,
    });
    setAutoFillDialogOpen(true);
  };

  const confirmAutoFill = () => {
    if (onAutoFill) {
      onAutoFill(autoFillData);
      toast({
        title: "Fields Updated",
        description: "Job fields have been populated with extracted data",
      });
    }
    setAutoFillDialogOpen(false);
    onClose();
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case "address":
        return "🏠";
      case "lot":
        return "📍";
      case "permit":
        return "📋";
      case "builder":
        return "👷";
      default:
        return "📝";
    }
  };

  const getPatternLabel = (type: string) => {
    switch (type) {
      case "address":
        return "Address";
      case "lot":
        return "Lot Number";
      case "permit":
        return "Permit";
      case "builder":
        return "Builder";
      default:
        return "Unknown";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-ocr">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="h-5 w-5" />
              Text Extraction (OCR)
            </DialogTitle>
            <DialogDescription>
              Extract text from photo using optical character recognition
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="relative">
              <img
                src={photoUrl}
                alt="OCR Photo"
                className="w-full max-h-64 object-contain rounded-md border"
                data-testid="img-ocr-photo"
              />
            </div>

            {isProcessing ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" data-testid="icon-loading" />
                    <span className="text-sm font-medium">Extracting text...</span>
                  </div>
                  <Progress value={progress} className="w-full" data-testid="progress-ocr" />
                  <p className="text-xs text-center text-muted-foreground" data-testid="text-progress">
                    {progress}% complete
                  </p>
                </CardContent>
              </Card>
            ) : extractedText ? (
              <>
                {confidence !== null && (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={confidence > 80 ? "default" : confidence > 60 ? "secondary" : "destructive"}
                      data-testid="badge-confidence"
                    >
                      {confidence > 80 ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {Math.round(confidence)}% Confidence
                    </Badge>
                  </div>
                )}

                {recognizedPatterns.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recognized Patterns</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {recognizedPatterns.map((pattern, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 bg-muted rounded-md"
                          data-testid={`pattern-${pattern.type}-${idx}`}
                        >
                          <span className="text-lg">{getPatternIcon(pattern.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">
                              {getPatternLabel(pattern.type)}
                            </div>
                            <div className="text-sm font-medium truncate">{pattern.value}</div>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {pattern.confidence}%
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Extracted Text</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyText}
                      data-testid="button-copy-text"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Text
                    </Button>
                  </div>
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Extracted text will appear here..."
                    className="min-h-[200px] font-mono text-sm"
                    data-testid="textarea-extracted-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can edit the text above to correct any OCR errors
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onAutoFill && recognizedPatterns.length > 0 && (
                    <Button
                      onClick={handleAutoFill}
                      data-testid="button-autofill"
                    >
                      Auto-fill Job Fields
                    </Button>
                  )}
                  <Button variant="outline" onClick={onClose} data-testid="button-close">
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No text extracted. The image may not contain readable text.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={autoFillDialogOpen} onOpenChange={setAutoFillDialogOpen}>
        <AlertDialogContent data-testid="dialog-autofill-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Auto-fill Job Fields</AlertDialogTitle>
            <AlertDialogDescription>
              The following information will be populated into the job fields:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 py-4">
            {autoFillData.address && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Address</div>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {autoFillData.address}
                </div>
              </div>
            )}
            {autoFillData.lotNumber && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Lot Number</div>
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {autoFillData.lotNumber}
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-autofill">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoFill} data-testid="button-confirm-autofill">
              Apply Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
