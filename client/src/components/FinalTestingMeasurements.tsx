import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Loader2, Calculator, ThermometerSun, Wind, Ruler, Lightbulb, Network, Upload, Camera, X, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeToFixed, safeDivide } from "@shared/numberUtils";
import { clientLogger } from "@/lib/logger";
import { PhotoCapture } from "@/components/PhotoCapture";
import { PhotoViewerDialog } from "@/components/photos/PhotoViewerDialog";
import type { Forecast, Photo } from "@shared/schema";

const measurementSchema = z.object({
  cfm50: z.coerce.number().min(0, "CFM50 must be positive").optional(),
  houseVolume: z.coerce.number().min(0, "House volume must be positive").optional(),
  actualACH50: z.coerce.number().min(0, "ACH50 must be positive").optional(),
  actualTDL: z.coerce.number().min(0, "TDL must be positive").optional(),
  actualDLO: z.coerce.number().min(0, "DLO must be positive").optional(),
  houseSurfaceArea: z.coerce.number().min(0, "Surface area must be positive").optional(),
  totalDuctLeakageCfm25: z.coerce.number().min(0).optional(),
  ductLeakageToOutsideCfm25: z.coerce.number().min(0).optional(),
  totalLedCount: z.coerce.number().int().min(0).optional(),
  stripLedCount: z.coerce.number().int().min(0).optional(),
  suppliesInsideConditioned: z.coerce.number().int().min(0).optional(),
  suppliesOutsideConditioned: z.coerce.number().int().min(0).optional(),
  returnRegistersCount: z.coerce.number().int().min(0).optional(),
  centralReturnsCount: z.coerce.number().int().min(0).optional(),
  aerosealed: z.boolean().optional(),
  outdoorTemp: z.coerce.number().optional(),
  indoorTemp: z.coerce.number().optional(),
  windSpeed: z.coerce.number().min(0, "Wind speed must be positive").optional(),
  weatherConditions: z.string().optional(),
  testConditions: z.string().optional(),
  equipmentNotes: z.string().optional(),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

interface FinalTestingMeasurementsProps {
  jobId: string;
}

export function FinalTestingMeasurements({ jobId }: FinalTestingMeasurementsProps) {
  const { toast } = useToast();
  const [calculatedACH50, setCalculatedACH50] = useState<number | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const { data: existingForecast } = useQuery<Forecast | null>({
    queryKey: ["/api/forecasts", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/forecasts?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!jobId,
  });

  // Query for manometer photos
  const { data: manometerPhotos = [], refetch: refetchPhotos } = useQuery<Photo[]>({
    queryKey: ["/api/photos", jobId, "duct-test-manometer"],
    queryFn: async () => {
      const response = await fetch(`/api/photos?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      const allPhotos = await response.json();
      // Filter for duct-test-manometer tagged photos
      return allPhotos.filter((photo: Photo) => 
        photo.tags?.includes("duct-test-manometer")
      );
    },
    enabled: !!jobId,
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      return apiRequest("DELETE", `/api/photos/${photoId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", jobId, "duct-test-manometer"] });
      toast({
        title: "Photo deleted",
        description: "Manometer photo has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      cfm50: undefined,
      houseVolume: undefined,
      actualACH50: undefined,
      actualTDL: undefined,
      actualDLO: undefined,
      houseSurfaceArea: undefined,
      totalDuctLeakageCfm25: undefined,
      ductLeakageToOutsideCfm25: undefined,
      totalLedCount: undefined,
      stripLedCount: undefined,
      suppliesInsideConditioned: undefined,
      suppliesOutsideConditioned: undefined,
      returnRegistersCount: undefined,
      centralReturnsCount: undefined,
      aerosealed: false,
      outdoorTemp: undefined,
      indoorTemp: undefined,
      windSpeed: undefined,
      weatherConditions: "",
      testConditions: "",
      equipmentNotes: "",
    },
  });

  // Load existing measurements if available
  useEffect(() => {
    if (existingForecast) {
      form.reset({
        cfm50: existingForecast.cfm50 != null ? parseFloat(existingForecast.cfm50) : undefined,
        houseVolume: existingForecast.houseVolume != null ? parseFloat(existingForecast.houseVolume) : undefined,
        actualACH50: existingForecast.actualAch50 != null ? parseFloat(existingForecast.actualAch50) : undefined,
        actualTDL: existingForecast.actualTdl != null ? parseFloat(existingForecast.actualTdl) : undefined,
        actualDLO: existingForecast.actualDlo != null ? parseFloat(existingForecast.actualDlo) : undefined,
        houseSurfaceArea: existingForecast.houseSurfaceArea != null ? parseFloat(existingForecast.houseSurfaceArea) : undefined,
        totalDuctLeakageCfm25: existingForecast.totalDuctLeakageCfm25 != null ? parseFloat(existingForecast.totalDuctLeakageCfm25) : undefined,
        ductLeakageToOutsideCfm25: existingForecast.ductLeakageToOutsideCfm25 != null ? parseFloat(existingForecast.ductLeakageToOutsideCfm25) : undefined,
        totalLedCount: existingForecast.totalLedCount ?? undefined,
        stripLedCount: existingForecast.stripLedCount ?? undefined,
        suppliesInsideConditioned: existingForecast.suppliesInsideConditioned ?? undefined,
        suppliesOutsideConditioned: existingForecast.suppliesOutsideConditioned ?? undefined,
        returnRegistersCount: existingForecast.returnRegistersCount ?? undefined,
        centralReturnsCount: existingForecast.centralReturnsCount ?? undefined,
        aerosealed: existingForecast.aerosealed ?? false,
        outdoorTemp: existingForecast.outdoorTemp != null ? parseFloat(existingForecast.outdoorTemp) : undefined,
        indoorTemp: existingForecast.indoorTemp != null ? parseFloat(existingForecast.indoorTemp) : undefined,
        windSpeed: existingForecast.windSpeed != null ? parseFloat(existingForecast.windSpeed) : undefined,
        weatherConditions: existingForecast.weatherConditions ?? "",
        testConditions: existingForecast.testConditions ?? "",
        equipmentNotes: existingForecast.equipmentNotes ?? "",
      });
    }
  }, [existingForecast, form]);

  // Real-time ACH50 calculation
  const cfm50 = form.watch("cfm50");
  const houseVolume = form.watch("houseVolume");

  useEffect(() => {
    if (cfm50 && houseVolume && houseVolume > 0) {
      const ach = safeDivide(cfm50 * 60, houseVolume);
      setCalculatedACH50(ach);
      form.setValue("actualACH50", parseFloat(safeToFixed(ach, 2)));
    } else {
      setCalculatedACH50(null);
    }
  }, [cfm50, houseVolume, form]);

  const saveMeasurementsMutation = useMutation({
    mutationFn: async (data: MeasurementFormValues) => {
      if (existingForecast) {
        return apiRequest("PATCH", `/api/forecasts/${existingForecast.id}`, {
          ...data,
          jobId,
        });
      } else {
        return apiRequest("POST", "/api/forecasts", {
          ...data,
          jobId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forecasts", jobId] });
      toast({
        title: "Measurements saved",
        description: "Field test measurements have been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save measurements. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MeasurementFormValues) => {
    saveMeasurementsMutation.mutate(data);
  };

  const handlePhotoUploadComplete = async () => {
    try {
      // Fetch all photos for this job to find the most recently uploaded one
      const response = await fetch(`/api/photos?jobId=${jobId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch photos");
      
      const allPhotos: Photo[] = await response.json();
      
      // Find photos that were just uploaded (within last 10 seconds) and don't have the tag yet
      const tenSecondsAgo = new Date(Date.now() - 10000);
      const recentPhotos = allPhotos.filter(photo => {
        const uploadedAt = new Date(photo.uploadedAt);
        const hasTag = photo.tags?.includes("duct-test-manometer");
        return uploadedAt > tenSecondsAgo && !hasTag;
      });

      // Tag each recent photo
      for (const photo of recentPhotos) {
        const existingTags = photo.tags || [];
        await apiRequest("PATCH", `/api/photos/${photo.id}`, {
          tags: [...existingTags, "duct-test-manometer"],
        });
      }

      // Refetch to show the newly tagged photos
      await refetchPhotos();
      setShowPhotoUpload(false);
      
      toast({
        title: "Photo uploaded",
        description: `${recentPhotos.length} manometer photo(s) added successfully.`,
      });
    } catch (error) {
      clientLogger.error("[FinalTestingMeasurements] Failed to tag uploaded photos:", error);
      // Still refetch and close dialog even if tagging failed
      await refetchPhotos();
      setShowPhotoUpload(false);
      toast({
        title: "Photo uploaded",
        description: "Photo uploaded but may need manual tagging.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    deletePhotoMutation.mutate(photoId);
  };

  const parseTECAutoTestOutput = (text: string): { cfm50?: number; ach50?: number; buildingVolume?: number } => {
    // More flexible patterns that allow optional text in parentheses and various delimiters
    // Match: "CFM50: 1250" OR "CFM 50: 1250" OR "CFM50 (Corrected): 1250" etc.
    const cfm50Match = text.match(/CFM\s*50\s*(?:\([^)]*\))?\s*[:=]\s*([\d,]+(?:\.\d+)?)/i);
    
    // Match: "ACH50: 2.5" OR "ACH 50: 2.5" OR "ACH50 (Natural): 2.5" etc.
    const ach50Match = text.match(/ACH\s*50\s*(?:\([^)]*\))?\s*[:=]\s*([\d,]+(?:\.\d+)?)/i);
    
    // Match: "Building Volume: 15000" OR "House Volume: 15000" OR "Volume (ft³): 15000" etc.
    const volumeMatch = text.match(/(?:Building|House)?\s*Volume\s*(?:\([^)]*\))?\s*[:=]\s*([\d,]+(?:\.\d+)?)/i);

    // Remove commas from numbers for parsing
    const cfm50 = cfm50Match ? parseFloat(cfm50Match[1].replace(/,/g, '')) : undefined;
    const ach50 = ach50Match ? parseFloat(ach50Match[1].replace(/,/g, '')) : undefined;
    const buildingVolume = volumeMatch ? parseFloat(volumeMatch[1].replace(/,/g, '')) : undefined;

    return { cfm50, ach50, buildingVolume };
  };

  const handleImportTECAutoTest = () => {
    if (!importText.trim()) {
      toast({
        title: "No data to import",
        description: "Please paste TEC Auto Test results before importing.",
        variant: "destructive",
      });
      return;
    }

    const parsed = parseTECAutoTestOutput(importText);
    
    if (!parsed.cfm50 && !parsed.ach50 && !parsed.buildingVolume) {
      toast({
        title: "Could not parse TEC Auto Test results",
        description: "Please check format and try again. Expected format includes CFM50, ACH50, and Building Volume values.",
        variant: "destructive",
      });
      return;
    }

    // Populate form fields with parsed values
    if (parsed.cfm50 !== undefined) {
      form.setValue("cfm50", parsed.cfm50, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }
    if (parsed.ach50 !== undefined) {
      form.setValue("actualACH50", parsed.ach50, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }
    if (parsed.buildingVolume !== undefined) {
      form.setValue("houseVolume", parsed.buildingVolume, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    }

    // Show success toast with imported values
    const importedFields = [];
    if (parsed.cfm50 !== undefined) importedFields.push(`CFM50: ${parsed.cfm50}`);
    if (parsed.ach50 !== undefined) importedFields.push(`ACH50: ${parsed.ach50}`);
    if (parsed.buildingVolume !== undefined) importedFields.push(`Volume: ${parsed.buildingVolume} cu ft`);

    toast({
      title: "TEC Auto Test results imported successfully",
      description: importedFields.join(", "),
    });

    // Close dialog and clear import text
    setShowImportDialog(false);
    setImportText("");
  };

  const actualACH50 = form.watch("actualACH50");
  const actualTDL = form.watch("actualTDL");
  const actualDLO = form.watch("actualDLO");

  // Pass/Fail thresholds
  const ach50Pass = actualACH50 !== undefined && actualACH50 <= 3.0;
  const tdlPass = actualTDL !== undefined && actualTDL <= 200;
  const dloPass = actualDLO !== undefined && actualDLO <= 50;

  return (
    <Card data-testid="card-final-testing-measurements">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Final Testing Measurements
            </CardTitle>
            <CardDescription>
              Record actual field test results for blower door and duct blaster tests
            </CardDescription>
          </div>
          {existingForecast && (
            <Badge variant="secondary" data-testid="badge-measurements-recorded">
              Measurements Recorded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Blower Door Test Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  Blower Door Test
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  data-testid="button-import-tec-auto-test"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import from TEC Auto Test
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cfm50"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFM50</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-cfm50"
                        />
                      </FormControl>
                      <FormDescription>Cubic feet per minute at 50 Pascals</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="houseVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House Volume (cu ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-house-volume"
                        />
                      </FormControl>
                      <FormDescription>Total conditioned volume</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualACH50"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>ACH50</span>
                        {calculatedACH50 !== null && (
                          <Badge variant={ach50Pass ? "default" : "destructive"} className="text-xs">
                            {ach50Pass ? "Pass" : "Fail"} (≤3.0 required)
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Auto-calculated"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-ach50"
                          className={calculatedACH50 !== null ? "bg-accent/20" : ""}
                        />
                      </FormControl>
                      <FormDescription>
                        {calculatedACH50 !== null ? `Auto-calculated: ${safeToFixed(calculatedACH50, 2)}` : "Air changes per hour at 50 Pascals"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="houseSurfaceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-surface-area"
                        />
                      </FormControl>
                      <FormDescription>Building envelope surface area</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Simplified Duct Leakage Test Section with Photo Documentation */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                  <Ruler className="h-5 w-5" />
                  Duct Leakage Test
                </h3>
                <Alert>
                  <Camera className="h-4 w-4" />
                  <AlertDescription>
                    Enter CFM values from manometer and upload photos of display
                  </AlertDescription>
                </Alert>
              </div>

              {/* CFM Value Inputs - Prominent and Touch-Friendly */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="totalDuctLeakageCfm25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Total Duct Leakage (CFM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter CFM value"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-total-duct-leakage-cfm"
                          className="text-lg font-medium"
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Total system leakage at 25 Pascals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ductLeakageToOutsideCfm25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Leakage to Outside (CFM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter CFM value"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-duct-leakage-outside-cfm"
                          className="text-lg font-medium"
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Leakage to unconditioned space at 25 Pascals
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Manometer Photos Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h4 className="text-base font-semibold">Manometer Photos</h4>
                  <Button
                    type="button"
                    onClick={() => setShowPhotoUpload(true)}
                    data-testid="button-add-manometer-photo"
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Add Manometer Photo
                  </Button>
                </div>

                {/* Photo Grid Display */}
                {manometerPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {manometerPhotos.map((photo) => (
                      <Card
                        key={photo.id}
                        className="relative overflow-hidden group"
                        data-testid={`card-manometer-photo-${photo.id}`}
                      >
                        <div className="aspect-square relative">
                          <img
                            src={photo.thumbnailPath || photo.fullUrl || photo.filePath}
                            alt={photo.caption || "Manometer reading"}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Action Buttons Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={() => setSelectedPhoto(photo)}
                              data-testid={`button-view-photo-${photo.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDeletePhoto(photo.id)}
                              disabled={deletePhotoMutation.isPending}
                              data-testid={`button-delete-photo-${photo.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Photo Caption/Date */}
                        {photo.caption && (
                          <div className="p-2 text-xs text-muted-foreground truncate">
                            {photo.caption}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No manometer photos yet. Add photos of your readings.
                    </p>
                  </div>
                )}
              </div>

              {/* Optional: Aerosealed Checkbox */}
              <FormField
                control={form.control}
                name="aerosealed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-aerosealed"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Aerosealed Duct System
                      </FormLabel>
                      <FormDescription>
                        Check if ducts have been professionally sealed with Aeroseal
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* LED Lighting */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                LED Lighting Count
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalLedCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total LED Fixtures</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-total-led-count"
                        />
                      </FormControl>
                      <FormDescription>Total number of LED light fixtures</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stripLedCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LED Strip Lights</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-strip-led-count"
                        />
                      </FormControl>
                      <FormDescription>Number of under-cabinet LED strips</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Supply and Return Registers */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Network className="h-4 w-4" />
                Supply & Return Registers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="suppliesInsideConditioned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supply Registers (Inside Conditioned)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-supplies-inside"
                        />
                      </FormControl>
                      <FormDescription>Supply registers in conditioned space</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="suppliesOutsideConditioned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supply Registers (Outside Conditioned)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-supplies-outside"
                        />
                      </FormControl>
                      <FormDescription>Supply registers outside conditioned space</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="returnRegistersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Registers</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-return-registers"
                        />
                      </FormControl>
                      <FormDescription>Total number of return registers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="centralReturnsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Central Returns</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-central-returns"
                        />
                      </FormControl>
                      <FormDescription>Number of central return registers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Environmental Conditions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ThermometerSun className="h-4 w-4" />
                Test Conditions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="outdoorTemp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outdoor Temp (°F)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="70.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-outdoor-temp"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="indoorTemp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indoor Temp (°F)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="70.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-indoor-temp"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="windSpeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wind Speed (mph)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-wind-speed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="weatherConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weather Conditions</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Clear, Sunny, Partly Cloudy, Overcast"
                        {...field}
                        data-testid="input-weather-conditions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Conditions & Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special conditions during testing (e.g., HVAC sealed, windows closed, doors sealed, etc.)"
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-test-conditions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipmentNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment & Calibration Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Equipment model numbers, calibration dates, battery levels, etc."
                        className="resize-none"
                        rows={3}
                        {...field}
                        data-testid="textarea-equipment-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={saveMeasurementsMutation.isPending}
              data-testid="button-save-measurements"
            >
              {saveMeasurementsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {existingForecast ? "Update Measurements" : "Save Measurements"}
            </Button>
          </form>
        </Form>
      </CardContent>

      {/* TEC Auto Test Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-import-tec-auto-test">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import from TEC Auto Test
            </DialogTitle>
            <DialogDescription>
              Paste the TEC Auto Test output below. The system will automatically extract CFM50, ACH50, and Building Volume values.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tec-import-text" className="text-sm font-medium">
                TEC Auto Test Output
              </label>
              <Textarea
                id="tec-import-text"
                placeholder={`Paste TEC Auto Test results here. Example format:\n\nCFM50: 1250\nACH50: 2.5\nBuilding Volume: 15000 cubic feet`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-tec-import"
              />
              <p className="text-xs text-muted-foreground">
                Expected format includes lines with CFM50, ACH50, and Building Volume (or House Volume) values.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportText("");
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImportTECAutoTest}
              data-testid="button-confirm-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-manometer-photo-upload">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Add Manometer Photo
            </DialogTitle>
            <DialogDescription>
              Take or upload photos of the manometer display showing duct leakage readings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <PhotoCapture
              jobId={jobId}
              bucketPath="photos/duct-test-manometer"
              onUploadComplete={handlePhotoUploadComplete}
              showGalleryByDefault={true}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPhotoUpload(false)}
              data-testid="button-close-photo-upload"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <PhotoViewerDialog
          photo={selectedPhoto}
          photos={manometerPhotos}
          onClose={() => setSelectedPhoto(null)}
          onDelete={(photoId) => {
            handleDeletePhoto(photoId);
            setSelectedPhoto(null);
          }}
          onNext={() => {
            const currentIndex = manometerPhotos.findIndex(p => p.id === selectedPhoto.id);
            if (currentIndex < manometerPhotos.length - 1) {
              setSelectedPhoto(manometerPhotos[currentIndex + 1]);
            }
          }}
          onPrevious={() => {
            const currentIndex = manometerPhotos.findIndex(p => p.id === selectedPhoto.id);
            if (currentIndex > 0) {
              setSelectedPhoto(manometerPhotos[currentIndex - 1]);
            }
          }}
        />
      )}
    </Card>
  );
}
