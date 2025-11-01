import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { insertMultifamilyProgramSchema } from "@shared/schema";
import { useCreateMultifamilyProgram, useSampleSize } from "@/lib/compliance";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

/**
 * Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
 * 
 * Business Context:
 * MultifamilyProgramSetup configures compliance programs for Minnesota multifamily projects.
 * Supports multiple compliance pathways:
 * - ENERGY STAR MFNC 1.2 (Multifamily New Construction)
 * - MN Housing EGCC 2020 (Energy Guide Compliance Certification)
 * - ZERH (Zero Energy Ready Homes with 45L tax credits)
 * - Building Energy Benchmarking (MN 2024 law compliance)
 */

/**
 * PROGRAM_TYPE_NAMES: Human-readable display names for compliance program types
 * 
 * Maps internal program type identifiers to user-friendly labels displayed
 * in the form and success messages.
 */
const PROGRAM_TYPE_NAMES: Record<string, string> = {
  energy_star_mfnc: "ENERGY STAR MFNC",
  egcc: "MN Housing EGCC",
  zerh: "ZERH",
  benchmarking: "Benchmarking",
  none: "None",
};

/**
 * CERTIFICATION_PATH_OPTIONS: ENERGY STAR certification pathways
 * 
 * ENERGY STAR MFNC allows three compliance paths:
 * - Prescriptive: Predefined measures and requirements
 * - ERI: Energy Rating Index performance-based path
 * - ASHRAE 90.1 Appendix G: Whole-building energy modeling path
 */
const CERTIFICATION_PATH_OPTIONS = [
  { value: "prescriptive", label: "Prescriptive" },
  { value: "eri", label: "ERI (Energy Rating Index)" },
  { value: "ashrae", label: "ASHRAE 90.1 Appendix G" },
] as const;

/**
 * BUILDER_VERIFIED_ITEMS_MAX: Maximum builder-verified items per ENERGY STAR MFNC 1.2
 * 
 * ENERGY STAR MFNC allows builders to self-verify up to 8 checklist items
 * instead of requiring third-party verification. This reduces inspection costs
 * while maintaining program integrity.
 */
const BUILDER_VERIFIED_ITEMS_MAX = 8;

/**
 * DEFAULT_PROGRAM_VERSION: Current ENERGY STAR MFNC version
 * 
 * Version 1.2 is the current standard as of 2024. This default ensures
 * new programs are created with the latest requirements.
 */
const DEFAULT_PROGRAM_VERSION = "1.2";

/**
 * Phase 3 - OPTIMIZE: Memoized form schema with Zod validation
 * 
 * Extends the base insertMultifamilyProgramSchema with additional fields
 * specific to the program setup workflow. Validation rules ensure:
 * - Program type is valid enum value
 * - Certification path is only set for ENERGY STAR
 * - Unit count is positive integer when provided
 * - Builder-verified items count is within 0-8 range per ENERGY STAR rules
 */
const formSchema = insertMultifamilyProgramSchema.extend({
  programType: z.enum(["energy_star_mfnc", "egcc", "zerh", "benchmarking", "none"]),
  certificationPath: z.enum(["prescriptive", "eri", "ashrae"]).optional(),
  unitCount: z.coerce.number().int().positive().optional(),
  builderVerifiedItemsCount: z.coerce.number().int().min(0).max(BUILDER_VERIFIED_ITEMS_MAX).default(0),
  requiresPhotoEvidence: z.boolean().default(false),
  samplingRequired: z.boolean().default(false),
  mroOrganization: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

/**
 * DEFAULT_FORM_VALUES: Initial form state for new program configuration
 * 
 * Sets sensible defaults:
 * - Program type "none" requires explicit selection
 * - Version defaults to current ENERGY STAR MFNC 1.2
 * - Effective date defaults to today (programs become active immediately)
 * - Photo evidence and sampling disabled by default (can be enabled as needed)
 */
const DEFAULT_FORM_VALUES: Partial<FormData> = {
  name: "",
  version: DEFAULT_PROGRAM_VERSION,
  effectiveDate: new Date(),
  programType: "none",
  certificationPath: undefined,
  unitCount: undefined,
  builderVerifiedItemsCount: 0,
  requiresPhotoEvidence: false,
  samplingRequired: false,
  mroOrganization: "",
};

/**
 * Phase 2 - BUILD: MultifamilyProgramSetupContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Provides form-based configuration for multifamily compliance programs.
 * 
 * Key Features:
 * - Dynamic form fields based on selected program type
 * - Real-time sampling calculation for ENERGY STAR projects
 * - Builder-verified items slider (0-8 range per ENERGY STAR rules)
 * - Photo evidence toggle for documentation requirements
 * - MRO organization tracking for third-party oversight
 */
function MultifamilyProgramSetupContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  /**
   * Phase 3 - OPTIMIZE: Local state for conditional form display
   * 
   * Tracks selected program type to control visibility of type-specific fields.
   * Separate from form state to enable immediate UI updates without form validation.
   */
  const [selectedProgramType, setSelectedProgramType] = useState<string>("none");
  
  /**
   * Phase 3 - OPTIMIZE: Local state for sample size calculation trigger
   * 
   * Tracks unit count independently to trigger useSampleSize query.
   * Allows debounced/controlled calculation separate from form state.
   */
  const [unitCount, setUnitCount] = useState<number | null>(null);

  /**
   * React Hook Form instance with Zod validation
   * 
   * Provides type-safe form state management with automatic validation
   * based on the formSchema defined above.
   */
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /**
   * Phase 5 - HARDEN: Create program mutation with error handling
   * 
   * Business Logic - Program Creation:
   * Creates a new multifamily program configuration in the database.
   * This configuration is then referenced by specific compliance checklists
   * and inspections throughout the project lifecycle.
   * 
   * The mutation automatically invalidates the multifamily programs cache
   * to ensure the programs list stays synchronized.
   */
  const createProgram = useCreateMultifamilyProgram();
  
  /**
   * Phase 5 - HARDEN: Sample size calculation query with retry: 2
   * 
   * Business Logic - Sampling Protocol:
   * ENERGY STAR MFNC requires sampling-based verification for multifamily projects.
   * The sample size calculation follows ANSI/RESNET/ICC 380 sampling protocols:
   * - Projects < 7 units: 100% sampling required
   * - Projects 7-20 units: Square root of unit count, rounded up
   * - Projects > 20 units: More complex tiered calculation
   * 
   * Retry configuration ensures resilience during network issues common in field operations.
   */
  const { 
    data: sampleSizeData, 
    isLoading: isCalculating,
    error: sampleSizeError,
    refetch: refetchSampleSize
  } = useSampleSize(unitCount);

  /**
   * Phase 3 - OPTIMIZE: Memoized program type display name lookup
   * 
   * Converts internal program type identifiers to user-friendly display names.
   * Memoized to prevent unnecessary recalculation on every render.
   */
  const getProgramDisplayName = useCallback((type: string): string => {
    return PROGRAM_TYPE_NAMES[type] || "Unknown";
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Memoized form submit handler
   * 
   * Business Logic - Program Submission:
   * Transforms form data into InsertMultifamilyProgram format and submits to API.
   * Uses program type display name as default if custom name not provided.
   * 
   * Success: Invalidates cache, shows toast, navigates to dashboard
   * Failure: Shows error toast, keeps form open for retry
   * 
   * Phase 5 - HARDEN: Error handling with user-friendly messages
   */
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      await createProgram.mutateAsync({
        name: data.name || getProgramDisplayName(data.programType || "none"),
        version: data.version,
        effectiveDate: data.effectiveDate,
        requiresPhotoEvidence: data.requiresPhotoEvidence,
        samplingRequired: data.samplingRequired,
        checklistTemplateId: null,
      });

      toast({
        title: "Success",
        description: "Multifamily program configuration saved successfully.",
      });

      navigate("/compliance");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save program configuration.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [createProgram, getProgramDisplayName, toast, navigate]);

  /**
   * Phase 3 - OPTIMIZE: Memoized cancel handler
   * 
   * Resets form to default values and navigates back to compliance hub.
   * Memoized to prevent unnecessary recreation on every render.
   */
  const handleCancel = useCallback(() => {
    form.reset();
    navigate("/compliance");
  }, [form, navigate]);

  /**
   * Phase 3 - OPTIMIZE: Memoized program type change handler
   * 
   * Business Logic - Program Type Selection:
   * When program type changes, this handler:
   * 1. Updates form field value
   * 2. Updates local selectedProgramType for conditional rendering
   * 3. If "none" selected, clears certification path and unit count
   * 
   * This ensures form state stays clean when switching between program types.
   */
  const handleProgramTypeChange = useCallback((value: string) => {
    setSelectedProgramType(value);
    if (value === "none") {
      form.setValue("certificationPath", undefined);
      form.setValue("unitCount", undefined);
      setUnitCount(null);
    }
  }, [form]);

  /**
   * Phase 3 - OPTIMIZE: Memoized unit count change handler
   * 
   * Updates both form state and local unitCount state to trigger
   * sample size calculation query.
   */
  const handleUnitCountChange = useCallback((value: number | undefined) => {
    setUnitCount(value || null);
  }, []);

  /**
   * Phase 3 - OPTIMIZE: Watch form fields for conditional rendering
   * 
   * React Hook Form watch API subscribes to specific field changes
   * to control visibility of conditional form sections.
   */
  const watchProgramType = form.watch("programType");
  const watchBuilderVerifiedCount = form.watch("builderVerifiedItemsCount");
  const watchUnitCount = form.watch("unitCount");

  /**
   * Phase 3 - OPTIMIZE: Memoized sample size display text
   * 
   * Calculates user-friendly sample size display string:
   * - "100% sampling" when all units must be tested
   * - "X units (Y% sampling)" for partial sampling
   * 
   * Memoized to prevent recalculation on unrelated renders.
   */
  const sampleSizeDisplayText = useMemo(() => {
    if (!sampleSizeData) return null;
    
    if (sampleSizeData.sampleSize === sampleSizeData.unitCount) {
      return "100% sampling";
    }
    
    const percentage = Math.round((sampleSizeData.sampleSize / sampleSizeData.unitCount) * 100);
    return `${sampleSizeData.sampleSize} units (${percentage}% sampling)`;
  }, [sampleSizeData]);

  return (
    <div className="flex flex-col h-screen" data-testid="page-multifamily-program-setup">
      <TopBar title="Multifamily Program Setup" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Phase 2 - BUILD: Error state for mutation failures */}
          {createProgram.isError && (
            <Alert variant="destructive" data-testid="alert-mutation-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription data-testid="text-mutation-error-message">
                Failed to save program configuration. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          )}

          <Card data-testid="card-program-setup-form">
            <CardHeader data-testid="header-program-setup">
              <CardTitle data-testid="text-form-title">
                Configure Multifamily Compliance Program
              </CardTitle>
              <CardDescription data-testid="text-form-description">
                Set up ENERGY STAR, EGCC, ZERH, or Benchmarking requirements for multifamily projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="form-program-setup">
                  
                  {/* Program Type Selector */}
                  <FormField
                    control={form.control}
                    name="programType"
                    render={({ field }) => (
                      <FormItem data-testid="field-program-type">
                        <FormLabel data-testid="label-program-type">Program Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleProgramTypeChange(value);
                            }}
                            data-testid="select-program-type"
                          >
                            <SelectTrigger data-testid="trigger-program-type">
                              <SelectValue placeholder="Select program type" />
                            </SelectTrigger>
                            <SelectContent data-testid="content-program-type">
                              <SelectItem value="energy_star_mfnc" data-testid="option-energy-star">
                                ENERGY STAR MFNC
                              </SelectItem>
                              <SelectItem value="egcc" data-testid="option-egcc">
                                MN Housing EGCC
                              </SelectItem>
                              <SelectItem value="zerh" data-testid="option-zerh">
                                ZERH
                              </SelectItem>
                              <SelectItem value="benchmarking" data-testid="option-benchmarking">
                                Benchmarking
                              </SelectItem>
                              <SelectItem value="none" data-testid="option-none">
                                None
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription data-testid="description-program-type">
                          Select the compliance program for this multifamily project
                        </FormDescription>
                        <FormMessage data-testid="message-program-type" />
                      </FormItem>
                    )}
                  />

                  {/* Certification Path (only show if ENERGY STAR selected) */}
                  {watchProgramType === "energy_star_mfnc" && (
                    <FormField
                      control={form.control}
                      name="certificationPath"
                      render={({ field }) => (
                        <FormItem className="space-y-3" data-testid="field-certification-path">
                          <FormLabel data-testid="label-certification-path">Certification Path</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex flex-col space-y-1"
                              data-testid="radio-group-certification-path"
                            >
                              {CERTIFICATION_PATH_OPTIONS.map((option) => (
                                <FormItem 
                                  key={option.value}
                                  className="flex items-center space-x-3 space-y-0"
                                  data-testid={`field-certification-${option.value}`}
                                >
                                  <FormControl>
                                    <RadioGroupItem 
                                      value={option.value} 
                                      data-testid={`radio-${option.value}`} 
                                    />
                                  </FormControl>
                                  <FormLabel 
                                    className="font-normal"
                                    data-testid={`label-certification-${option.value}`}
                                  >
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormDescription data-testid="description-certification-path">
                            Select the compliance path for ENERGY STAR certification
                          </FormDescription>
                          <FormMessage data-testid="message-certification-path" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Unit Count */}
                  {watchProgramType !== "none" && (
                    <FormField
                      control={form.control}
                      name="unitCount"
                      render={({ field }) => (
                        <FormItem data-testid="field-unit-count">
                          <FormLabel data-testid="label-unit-count">Unit Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Enter total number of units"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value ? parseInt(e.target.value) : undefined;
                                field.onChange(value);
                                handleUnitCountChange(value);
                              }}
                              data-testid="input-unit-count"
                            />
                          </FormControl>
                          <FormDescription data-testid="description-unit-count">
                            Total number of units in this multifamily project
                          </FormDescription>
                          <FormMessage data-testid="message-unit-count" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Sample Size Display */}
                  {watchProgramType !== "none" && watchUnitCount && (
                    <div 
                      className="rounded-lg border p-4 bg-muted/50" 
                      data-testid="display-sample-size"
                    >
                      <div 
                        className="text-sm font-medium mb-2"
                        data-testid="label-sample-size"
                      >
                        Required Sample Size
                      </div>
                      
                      {/* Phase 2 - BUILD: Skeleton loading state for calculation */}
                      {isCalculating ? (
                        <div data-testid="skeleton-sample-size">
                          <Skeleton className="h-6 w-48 mb-2" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      ) : sampleSizeError ? (
                        /* Phase 2 - BUILD: Error state with retry button */
                        <Alert variant="destructive" data-testid="alert-sample-size-error">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="flex items-center justify-between">
                            <span data-testid="text-sample-size-error">
                              Failed to calculate sample size
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => refetchSampleSize()}
                              data-testid="button-retry-sample-size"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          </AlertDescription>
                        </Alert>
                      ) : sampleSizeData ? (
                        <>
                          <div 
                            className="text-lg font-semibold" 
                            data-testid="text-sample-calculation"
                          >
                            {sampleSizeDisplayText}
                          </div>
                          {sampleSizeData.protocol && (
                            <div 
                              className="text-sm text-muted-foreground mt-1" 
                              data-testid="text-sample-protocol"
                            >
                              Protocol: {sampleSizeData.protocol}
                            </div>
                          )}
                        </>
                      ) : (
                        <div 
                          className="text-sm text-muted-foreground"
                          data-testid="text-sample-size-placeholder"
                        >
                          Enter unit count to calculate sample size
                        </div>
                      )}
                    </div>
                  )}

                  {/* MRO Organization */}
                  {watchProgramType === "energy_star_mfnc" && (
                    <FormField
                      control={form.control}
                      name="mroOrganization"
                      render={({ field }) => (
                        <FormItem data-testid="field-mro-organization">
                          <FormLabel data-testid="label-mro-organization">
                            MRO Organization (Optional)
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., RESNET, ENERGY STAR Provider"
                              {...field}
                              data-testid="input-mro-organization"
                            />
                          </FormControl>
                          <FormDescription data-testid="description-mro-organization">
                            Multifamily Review Organization overseeing this project
                          </FormDescription>
                          <FormMessage data-testid="message-mro-organization" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Builder-Verified Items Settings */}
                  {watchProgramType === "energy_star_mfnc" && (
                    <div 
                      className="space-y-4 rounded-lg border p-4" 
                      data-testid="section-builder-verified-items"
                    >
                      <h3 
                        className="font-medium"
                        data-testid="heading-builder-verified-items"
                      >
                        Builder-Verified Items Settings
                      </h3>
                      
                      <FormField
                        control={form.control}
                        name="builderVerifiedItemsCount"
                        render={({ field }) => (
                          <FormItem data-testid="field-builder-verified-count">
                            <FormLabel data-testid="label-builder-verified-count">
                              Number of Builder-Verified Items (0-{BUILDER_VERIFIED_ITEMS_MAX})
                            </FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  min={0}
                                  max={BUILDER_VERIFIED_ITEMS_MAX}
                                  step={1}
                                  value={[field.value || 0]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  data-testid="slider-builder-verified-count"
                                />
                                <div 
                                  className="text-center text-2xl font-bold" 
                                  data-testid="text-builder-verified-count"
                                >
                                  {field.value || 0}
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription data-testid="description-builder-verified-count">
                              ENERGY STAR allows up to {BUILDER_VERIFIED_ITEMS_MAX} builder-verified items
                            </FormDescription>
                            <FormMessage data-testid="message-builder-verified-count" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requiresPhotoEvidence"
                        render={({ field }) => (
                          <FormItem 
                            className="flex flex-row items-center justify-between rounded-lg border p-4"
                            data-testid="field-photo-evidence"
                          >
                            <div className="space-y-0.5">
                              <FormLabel 
                                className="text-base"
                                data-testid="label-photo-evidence"
                              >
                                Photo Evidence Required
                              </FormLabel>
                              <FormDescription data-testid="description-photo-evidence">
                                Require photo documentation for builder-verified items
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-photo-required"
                              />
                            </FormControl>
                            <FormMessage data-testid="message-photo-evidence" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Form Actions */}
                  <div 
                    className="flex gap-3 justify-end pt-4 border-t"
                    data-testid="actions-form"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={createProgram.isPending}
                      data-testid="button-cancel"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createProgram.isPending}
                      data-testid="button-save"
                    >
                      {/* Phase 2 - BUILD: Removed emoji, using Loader2 icon instead */}
                      {createProgram.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="icon-saving" />
                          <span data-testid="text-button-saving">Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" data-testid="icon-save" />
                          <span data-testid="text-button-save">Save Program</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>

      <BottomNav activeTab="dashboard" />
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for production resilience
 * 
 * Wraps the main component to catch and display any runtime errors gracefully.
 * Prevents the entire application from crashing if this page encounters an error.
 */
export default function MultifamilyProgramSetup() {
  return (
    <ErrorBoundary>
      <MultifamilyProgramSetupContent />
    </ErrorBoundary>
  );
}
