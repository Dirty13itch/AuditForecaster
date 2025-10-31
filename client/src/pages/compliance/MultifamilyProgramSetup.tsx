import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, X } from "lucide-react";
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
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const formSchema = insertMultifamilyProgramSchema.extend({
  programType: z.enum(["energy_star_mfnc", "egcc", "zerh", "benchmarking", "none"]),
  certificationPath: z.enum(["prescriptive", "eri", "ashrae"]).optional(),
  unitCount: z.coerce.number().int().positive().optional(),
  builderVerifiedItemsCount: z.coerce.number().int().min(0).max(8).default(0),
  requiresPhotoEvidence: z.boolean().default(false),
  samplingRequired: z.boolean().default(false),
  mroOrganization: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function MultifamilyProgramSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedProgramType, setSelectedProgramType] = useState<string>("none");
  const [unitCount, setUnitCount] = useState<number | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      version: "1.2",
      effectiveDate: new Date(),
      programType: "none",
      certificationPath: undefined,
      unitCount: undefined,
      builderVerifiedItemsCount: 0,
      requiresPhotoEvidence: false,
      samplingRequired: false,
      mroOrganization: "",
    },
  });

  const createProgram = useCreateMultifamilyProgram();
  
  const { data: sampleSizeData, isLoading: isCalculating } = useSampleSize(unitCount);

  const onSubmit = async (data: FormData) => {
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

      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save program configuration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    form.reset();
    setLocation("/");
  };

  const getProgramDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      energy_star_mfnc: "ENERGY STAR MFNC",
      egcc: "MN Housing EGCC",
      zerh: "ZERH",
      benchmarking: "Benchmarking",
      none: "None",
    };
    return names[type] || "Unknown";
  };

  const watchProgramType = form.watch("programType");
  const watchBuilderVerifiedCount = form.watch("builderVerifiedItemsCount");
  const watchUnitCount = form.watch("unitCount");

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Multifamily Program Setup" />
      
      <main className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configure Multifamily Compliance Program</CardTitle>
              <CardDescription>
                Set up ENERGY STAR, EGCC, ZERH, or Benchmarking requirements for multifamily projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  {/* Program Type Selector */}
                  <FormField
                    control={form.control}
                    name="programType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Program Type</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedProgramType(value);
                              if (value === "none") {
                                form.setValue("certificationPath", undefined);
                                form.setValue("unitCount", undefined);
                                setUnitCount(null);
                              }
                            }}
                            data-testid="select-program-type"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select program type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="energy_star_mfnc" data-testid="option-energy-star">ENERGY STAR MFNC</SelectItem>
                              <SelectItem value="egcc" data-testid="option-egcc">MN Housing EGCC</SelectItem>
                              <SelectItem value="zerh" data-testid="option-zerh">ZERH</SelectItem>
                              <SelectItem value="benchmarking" data-testid="option-benchmarking">Benchmarking</SelectItem>
                              <SelectItem value="none" data-testid="option-none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Select the compliance program for this multifamily project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Certification Path (only show if ENERGY STAR selected) */}
                  {watchProgramType === "energy_star_mfnc" && (
                    <FormField
                      control={form.control}
                      name="certificationPath"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Certification Path</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex flex-col space-y-1"
                              data-testid="radio-group-certification-path"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="prescriptive" data-testid="radio-prescriptive" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Prescriptive
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="eri" data-testid="radio-eri" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  ERI (Energy Rating Index)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="ashrae" data-testid="radio-ashrae" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  ASHRAE 90.1 Appendix G
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Select the compliance path for ENERGY STAR certification
                          </FormDescription>
                          <FormMessage />
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
                        <FormItem>
                          <FormLabel>Unit Count</FormLabel>
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
                                setUnitCount(value || null);
                              }}
                              data-testid="input-unit-count"
                            />
                          </FormControl>
                          <FormDescription>
                            Total number of units in this multifamily project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Sample Size Display */}
                  {watchProgramType !== "none" && watchUnitCount && (
                    <div className="rounded-lg border p-4 bg-muted/50" data-testid="display-sample-size">
                      <div className="text-sm font-medium mb-2">Required Sample Size</div>
                      {isCalculating ? (
                        <Skeleton className="h-6 w-48" />
                      ) : sampleSizeData ? (
                        <div className="text-lg font-semibold" data-testid="text-sample-calculation">
                          {sampleSizeData.sampleSize === sampleSizeData.unitCount
                            ? "100% sampling"
                            : `${sampleSizeData.sampleSize} units (${Math.round((sampleSizeData.sampleSize / sampleSizeData.unitCount) * 100)}% sampling)`}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Enter unit count to calculate sample size
                        </div>
                      )}
                      {sampleSizeData?.protocol && (
                        <div className="text-sm text-muted-foreground mt-1" data-testid="text-sample-protocol">
                          Protocol: {sampleSizeData.protocol}
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
                        <FormItem>
                          <FormLabel>MRO Organization (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., RESNET, ENERGY STAR Provider"
                              {...field}
                              data-testid="input-mro-organization"
                            />
                          </FormControl>
                          <FormDescription>
                            Multifamily Review Organization overseeing this project
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Builder-Verified Items Settings */}
                  {watchProgramType === "energy_star_mfnc" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <h3 className="font-medium">Builder-Verified Items Settings</h3>
                      
                      <FormField
                        control={form.control}
                        name="builderVerifiedItemsCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Builder-Verified Items (0-8)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  min={0}
                                  max={8}
                                  step={1}
                                  value={[field.value || 0]}
                                  onValueChange={(value) => field.onChange(value[0])}
                                  data-testid="slider-builder-verified-count"
                                />
                                <div className="text-center text-2xl font-bold" data-testid="text-builder-verified-count">
                                  {field.value || 0}
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              ENERGY STAR allows up to 8 builder-verified items
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requiresPhotoEvidence"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Photo Evidence Required</FormLabel>
                              <FormDescription>
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
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
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
                      {createProgram.isPending ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Program
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
