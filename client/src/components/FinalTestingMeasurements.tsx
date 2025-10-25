import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Loader2, Calculator, ThermometerSun, Wind, Ruler, Lightbulb, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeToFixed, safeDivide } from "@shared/numberUtils";
import type { Forecast } from "@shared/schema";

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
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Wind className="h-4 w-4" />
                Blower Door Test
              </h3>
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

            {/* Duct Blaster Test Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Duct Blaster Test
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="actualTDL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Total Duct Leakage (TDL)</span>
                        {actualTDL !== undefined && (
                          <Badge variant={tdlPass ? "default" : "destructive"} className="text-xs">
                            {tdlPass ? "Pass" : "Fail"} (≤200 CFM25)
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-tdl"
                        />
                      </FormControl>
                      <FormDescription>CFM25 - Total system leakage</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualDLO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span>Duct Leakage to Outside (DLO)</span>
                        {actualDLO !== undefined && (
                          <Badge variant={dloPass ? "default" : "destructive"} className="text-xs">
                            {dloPass ? "Pass" : "Fail"} (≤50 CFM25)
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-dlo"
                        />
                      </FormControl>
                      <FormDescription>CFM25 - Leakage to unconditioned space</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Detailed Duct Leakage Measurements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Detailed Duct Leakage (CFM25)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalDuctLeakageCfm25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Duct Leakage CFM25</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-total-duct-leakage"
                        />
                      </FormControl>
                      <FormDescription>All leaks in duct system at 25 Pa</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ductLeakageToOutsideCfm25"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duct Leakage to Outside CFM25</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-duct-leakage-outside"
                        />
                      </FormControl>
                      <FormDescription>Leaks to unconditioned space at 25 Pa</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
    </Card>
  );
}
