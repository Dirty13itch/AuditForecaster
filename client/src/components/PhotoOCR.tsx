import { useState, useEffect, useRef } from "react";
import { createWorker } from "tesseract.js";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackUpdate } from '@/lib/analytics/events';
import { Copy, ScanText, Loader2, X, CheckCircle, AlertCircle, Wrench, Building2, Gauge, Thermometer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  photoId?: string;
  jobId?: string;
  onClose: () => void;
  onAutoFill?: (data: { address?: string; lotNumber?: string }) => void;
  onSuggestTags?: (tags: string[]) => void;
}

interface RecognizedPattern {
  type: "address" | "lot" | "permit" | "builder" | "serial" | "model" | "energyLabel" | "rValue" | "equipment" | "measurement";
  value: string;
  confidence: number;
  category?: string;
  metadata?: Record<string, any>;
}

export function PhotoOCR({ open, photoUrl, photoId, jobId, onClose, onAutoFill, onSuggestTags }: PhotoOCRProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [recognizedPatterns, setRecognizedPatterns] = useState<RecognizedPattern[]>([]);
  const [autoFillDialogOpen, setAutoFillDialogOpen] = useState(false);
  const [autoFillData, setAutoFillData] = useState<{ address?: string; lotNumber?: string }>({});
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const workerRef = useRef<Tesseract.Worker | null>(null);

  // Save OCR results to database
  const saveOcrMutation = useMutation({
    mutationFn: async (data: { ocrText: string; ocrConfidence: number; ocrMetadata: any }) => {
      if (!photoId) return;
      return await apiRequest(`/api/photos/${photoId}/ocr`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      if (photoId) {
        trackUpdate('photo', photoId, undefined, { ocrCompleted: true });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/photos/${photoId}`] });
      toast({
        title: "OCR Results Saved",
        description: "Text extraction results have been saved to the database.",
      });
    },
  });

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
    setSuggestedTags([]);

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

      const tags = generateTagSuggestions(patterns, text);
      setSuggestedTags(tags);

      // Save OCR results if photoId is available
      if (photoId) {
        saveOcrMutation.mutate({
          ocrText: text,
          ocrConfidence: avgConfidence,
          ocrMetadata: {
            patterns,
            suggestedTags: tags,
            wordConfidence: data.words?.map(w => ({
              text: w.text,
              confidence: w.confidence
            })),
          },
        });
      }

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

    // Address patterns
    const addressRegex = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct|circle|cir|place|pl)[,\s]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi;
    const addressMatches = text.match(addressRegex);
    if (addressMatches) {
      addressMatches.forEach((match) => {
        patterns.push({
          type: "address",
          value: match.trim(),
          confidence: 80,
          category: "location",
        });
      });
    }

    // Simple address pattern
    const simpleAddressRegex = /(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct))/gi;
    const simpleAddressMatches = text.match(simpleAddressRegex);
    if (simpleAddressMatches && !addressMatches) {
      simpleAddressMatches.slice(0, 2).forEach((match) => {
        patterns.push({
          type: "address",
          value: match.trim(),
          confidence: 60,
          category: "location",
        });
      });
    }

    // Lot numbers
    const lotRegex = /(?:lot|LOT)[:\s#]*(\d+[A-Z]?)/gi;
    const lotMatches = Array.from(text.matchAll(lotRegex));
    lotMatches.forEach((match) => {
      patterns.push({
        type: "lot",
        value: match[1],
        confidence: 85,
        category: "location",
      });
    });

    // Permit numbers
    const permitRegex = /(?:permit|PERMIT)[:\s#]*([A-Z0-9-]+)/gi;
    const permitMatches = Array.from(text.matchAll(permitRegex));
    permitMatches.forEach((match) => {
      patterns.push({
        type: "permit",
        value: match[1],
        confidence: 75,
        category: "administrative",
      });
    });

    // Builder/Contractor names
    const builderRegex = /(?:builder|BUILDER|contractor|CONTRACTOR)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
    const builderMatches = Array.from(text.matchAll(builderRegex));
    builderMatches.forEach((match) => {
      patterns.push({
        type: "builder",
        value: match[1],
        confidence: 70,
        category: "administrative",
      });
    });

    // Equipment Serial Numbers
    const serialRegex = /(?:serial|SN|S\/N|serial\s*(?:no|number))[:\s]*([A-Z0-9-]+)/gi;
    const serialMatches = Array.from(text.matchAll(serialRegex));
    serialMatches.forEach((match) => {
      patterns.push({
        type: "serial",
        value: match[1],
        confidence: 85,
        category: "equipment",
        metadata: { field: "serialNumber" },
      });
    });

    // Model Numbers
    const modelRegex = /(?:model|MODEL|mod\.|MDL)[:\s]*([A-Z0-9-]+(?:\s+[A-Z0-9-]+)?)/gi;
    const modelMatches = Array.from(text.matchAll(modelRegex));
    modelMatches.forEach((match) => {
      patterns.push({
        type: "model",
        value: match[1].trim(),
        confidence: 80,
        category: "equipment",
        metadata: { field: "modelNumber" },
      });
    });

    // Energy Labels (EnergyGuide, ENERGY STAR)
    const energyGuideRegex = /(?:yearly\s+energy\s+cost|estimated\s+yearly)[:\s]*\$?(\d+)/gi;
    const energyGuideMatches = Array.from(text.matchAll(energyGuideRegex));
    energyGuideMatches.forEach((match) => {
      patterns.push({
        type: "energyLabel",
        value: `$${match[1]} yearly`,
        confidence: 75,
        category: "efficiency",
        metadata: { type: "EnergyGuide", cost: match[1] },
      });
    });

    const energyStarRegex = /(ENERGY\s*STAR)/gi;
    const energyStarMatches = text.match(energyStarRegex);
    if (energyStarMatches) {
      patterns.push({
        type: "energyLabel",
        value: "ENERGY STAR Certified",
        confidence: 90,
        category: "efficiency",
        metadata: { type: "ENERGY STAR", certified: true },
      });
    }

    // R-Values for insulation
    const rValueRegex = /R-?(\d+(?:\.\d+)?)/gi;
    const rValueMatches = Array.from(text.matchAll(rValueRegex));
    rValueMatches.forEach((match) => {
      patterns.push({
        type: "rValue",
        value: `R-${match[1]}`,
        confidence: 85,
        category: "insulation",
        metadata: { value: parseFloat(match[1]) },
      });
    });

    // Equipment types (HVAC, Furnace, etc.)
    const equipmentTypes = [
      { pattern: /(?:furnace|FURNACE)/gi, name: "Furnace" },
      { pattern: /(?:air\s+conditioner|A\/C|AC\s+unit)/gi, name: "Air Conditioner" },
      { pattern: /(?:heat\s+pump|HEAT\s+PUMP)/gi, name: "Heat Pump" },
      { pattern: /(?:water\s+heater|WATER\s+HEATER)/gi, name: "Water Heater" },
      { pattern: /(?:boiler|BOILER)/gi, name: "Boiler" },
      { pattern: /(?:thermostat|THERMOSTAT)/gi, name: "Thermostat" },
    ];

    equipmentTypes.forEach(({ pattern, name }) => {
      if (pattern.test(text)) {
        patterns.push({
          type: "equipment",
          value: name,
          confidence: 85,
          category: "equipment",
          metadata: { equipmentType: name.toLowerCase().replace(/\s+/g, "_") },
        });
      }
    });

    // Measurements and dimensions
    const measurementRegex = /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(?:inches|in|"|feet|ft|')/gi;
    const measurementMatches = Array.from(text.matchAll(measurementRegex));
    measurementMatches.forEach((match) => {
      patterns.push({
        type: "measurement",
        value: `${match[1]} × ${match[2]}`,
        confidence: 75,
        category: "specification",
        metadata: { width: match[1], height: match[2] },
      });
    });

    return patterns;
  };

  const generateTagSuggestions = (patterns: RecognizedPattern[], text: string): string[] => {
    const tags = new Set<string>();

    // Add tags based on patterns
    patterns.forEach((pattern) => {
      switch (pattern.type) {
        case "equipment":
          tags.add("equipment");
          if (pattern.metadata?.equipmentType) {
            tags.add(pattern.metadata.equipmentType);
          }
          break;
        case "energyLabel":
          tags.add("energy_efficient");
          if (pattern.metadata?.type === "ENERGY STAR") {
            tags.add("energy_star");
          }
          break;
        case "rValue":
          tags.add("insulation");
          const rValue = pattern.metadata?.value;
          if (rValue && rValue >= 30) {
            tags.add("high_efficiency_insulation");
          }
          break;
        case "serial":
        case "model":
          tags.add("equipment_info");
          break;
      }
    });

    // Add location-based tags
    const locationKeywords = {
      attic: ["attic", "roof space"],
      basement: ["basement", "crawl space", "foundation"],
      exterior: ["exterior", "outside", "outdoor"],
      kitchen: ["kitchen"],
      bathroom: ["bathroom", "bath"],
      garage: ["garage"],
    };

    Object.entries(locationKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        tags.add(tag);
      }
    });

    // Add system tags
    const systemKeywords = {
      hvac: ["hvac", "heating", "cooling", "air conditioning", "furnace"],
      plumbing: ["plumbing", "pipe", "water", "drain"],
      electrical: ["electrical", "wire", "circuit", "panel", "breaker"],
      insulation: ["insulation", "r-value", "fiberglass", "foam"],
    };

    Object.entries(systemKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        tags.add(tag);
      }
    });

    // Add issue tags
    const issueKeywords = {
      damage: ["damage", "broken", "crack", "leak", "rust"],
      code_violation: ["violation", "code", "non-compliant"],
      safety_hazard: ["hazard", "danger", "unsafe", "risk"],
    };

    Object.entries(issueKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        tags.add(tag);
      }
    });

    return Array.from(tags);
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

  const handleApplyTags = () => {
    if (onSuggestTags && suggestedTags.length > 0) {
      onSuggestTags(suggestedTags);
      toast({
        title: "Tags Applied",
        description: `${suggestedTags.length} tags have been suggested for the photo`,
      });
    }
  };

  const handleSaveText = () => {
    if (photoId && editedText) {
      saveOcrMutation.mutate({
        ocrText: editedText,
        ocrConfidence: confidence || 0,
        ocrMetadata: {
          patterns: recognizedPatterns,
          suggestedTags,
          edited: true,
        },
      });
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case "address":
      case "lot":
        return "📍";
      case "permit":
        return "📋";
      case "builder":
        return "👷";
      case "serial":
      case "model":
        return "🔧";
      case "energyLabel":
        return "⚡";
      case "rValue":
        return "🏠";
      case "equipment":
        return "🔨";
      case "measurement":
        return "📏";
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
      case "serial":
        return "Serial Number";
      case "model":
        return "Model Number";
      case "energyLabel":
        return "Energy Label";
      case "rValue":
        return "R-Value";
      case "equipment":
        return "Equipment";
      case "measurement":
        return "Measurement";
      default:
        return "Unknown";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "location":
        return <Building2 className="h-4 w-4" />;
      case "equipment":
        return <Wrench className="h-4 w-4" />;
      case "efficiency":
        return <Gauge className="h-4 w-4" />;
      case "insulation":
        return <Thermometer className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const groupedPatterns = recognizedPatterns.reduce((acc, pattern) => {
    const category = pattern.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pattern);
    return acc;
  }, {} as Record<string, RecognizedPattern[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-ocr">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanText className="h-5 w-5" />
              Smart Text Extraction (OCR)
            </DialogTitle>
            <DialogDescription>
              Extract and analyze text from photo using optical character recognition
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="relative">
              <img
                src={photoUrl}
                alt="Photo being processed for text extraction using Optical Character Recognition (OCR)"
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
              <Tabs defaultValue="extracted" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="extracted">Extracted Text</TabsTrigger>
                  <TabsTrigger value="patterns">Smart Detection</TabsTrigger>
                  <TabsTrigger value="tags">Suggested Tags</TabsTrigger>
                </TabsList>

                <TabsContent value="extracted" className="space-y-4">
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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Extracted Text</label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyText}
                          data-testid="button-copy-text"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        {photoId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveText}
                            disabled={saveOcrMutation.isPending}
                            data-testid="button-save-text"
                          >
                            Save Edits
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      placeholder="Extracted text will appear here..."
                      className="min-h-[300px] font-mono text-sm"
                      data-testid="textarea-extracted-text"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can edit the text above to correct any OCR errors
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="patterns" className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {Object.entries(groupedPatterns).map(([category, patterns]) => (
                      <Card key={category} className="mb-4">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {getCategoryIcon(category)}
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {patterns.map((pattern, idx) => (
                            <div 
                              key={`${category}-${idx}`}
                              className="flex items-start gap-2 p-2 bg-muted rounded-md"
                              data-testid={`pattern-${pattern.type}-${idx}`}
                            >
                              <span className="text-lg">{getPatternIcon(pattern.type)}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground">
                                  {getPatternLabel(pattern.type)}
                                </div>
                                <div className="text-sm font-medium">{pattern.value}</div>
                                {pattern.metadata && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Object.entries(pattern.metadata)
                                      .filter(([key]) => key !== "field")
                                      .map(([key, value]) => `${key}: ${value}`)
                                      .join(", ")}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline" className="shrink-0 text-xs">
                                {pattern.confidence}%
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tags" className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Based on the extracted text, these tags are suggested:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.length > 0 ? (
                        suggestedTags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag.replace(/_/g, " ")}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags suggested</p>
                      )}
                    </div>
                    {suggestedTags.length > 0 && onSuggestTags && (
                      <Button
                        onClick={handleApplyTags}
                        className="mt-4"
                        data-testid="button-apply-tags"
                      >
                        Apply Suggested Tags
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No text extracted. The image may not contain readable text.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {onAutoFill && recognizedPatterns.some(p => p.type === "address" || p.type === "lot") && (
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