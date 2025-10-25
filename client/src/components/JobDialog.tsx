import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { generateJobName } from "@shared/jobNameGenerator";
import type { Job, Builder, Plan, Development, Lot } from "@shared/schema";

const JOB_TYPES = [
  'Pre-Drywall Inspection',
  'Final Testing',
  'Blower Door Only',
  'Duct Blaster Only',
  'Blower Door Retest',
  'Infrared Imaging',
  'Multifamily Project',
  'Other'
] as const;

function getDefaultPricing(inspectionType: string): number | undefined {
  const pricingMap: Record<string, number> = {
    'Pre-Drywall Inspection': 100,
    'Final Testing': 350,
    'Blower Door Only': 200,
    'Duct Blaster Only': 200,
    'Blower Door Retest': 200,
  };
  return pricingMap[inspectionType];
}

const jobFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  builderId: z.string().optional(),
  planId: z.string().optional(),
  lotId: z.string().optional(),
  contractor: z.string().min(1, "Contractor is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
  pricing: z.number().optional(),
  scheduledDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.string().default("pending"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  floorArea: z.number().optional(),
  surfaceArea: z.number().optional(),
  houseVolume: z.number().optional(),
  stories: z.number().optional(),
  notes: z.string().optional(),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  builders: Builder[];
  onSave: (data: JobFormValues) => Promise<void>;
  isPending?: boolean;
}

export default function JobDialog({ 
  open, 
  onOpenChange, 
  job, 
  builders,
  onSave,
  isPending = false
}: JobDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<string>("");

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      name: job?.name || "",
      address: job?.address || "",
      builderId: job?.builderId || "",
      planId: job?.planId || "",
      lotId: job?.lotId || "",
      contractor: job?.contractor || "",
      inspectionType: job?.inspectionType || "",
      pricing: job?.pricing ? parseFloat(job.pricing as any) : undefined,
      scheduledDate: job?.scheduledDate ? new Date(job.scheduledDate) : undefined,
      priority: (job?.priority as "low" | "medium" | "high") || "medium",
      status: job?.status || "pending",
      latitude: job?.latitude || undefined,
      longitude: job?.longitude || undefined,
      floorArea: job?.floorArea ? parseFloat(job.floorArea as any) : undefined,
      surfaceArea: job?.surfaceArea ? parseFloat(job.surfaceArea as any) : undefined,
      houseVolume: job?.houseVolume ? parseFloat(job.houseVolume as any) : undefined,
      stories: job?.stories ? parseFloat(job.stories as any) : undefined,
      notes: job?.notes || "",
    },
  });

  const formData = form.watch();

  const autoSave = useAutoSave({
    data: formData,
    onSave: async () => {
      if (job) {
        await onSave(formData);
      }
    },
    enabled: !!job && open,
  });

  // Watch for changes to auto-generate name for new jobs
  const inspectionType = form.watch('inspectionType');
  const scheduledDate = form.watch('scheduledDate');
  const address = form.watch('address');
  const builderId = form.watch('builderId');
  const planId = form.watch('planId');
  const lotId = form.watch('lotId');

  useEffect(() => {
    // Only auto-generate for new jobs (not editing)
    if (!job && inspectionType && scheduledDate && address) {
      const autoName = generateJobName(scheduledDate, inspectionType, address);
      form.setValue('name', autoName);
    }
  }, [inspectionType, scheduledDate, address, job, form]);

  // Fetch plans for the selected builder
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/plans/builder', builderId],
    enabled: !!builderId,
  });

  // Fetch developments for the selected builder
  const { data: developments = [], isLoading: developmentsLoading } = useQuery<Development[]>({
    queryKey: ['/api/builders', builderId, 'developments'],
    enabled: !!builderId,
  });

  // Fetch the lot directly when form has a lotId (to get developmentId)
  const { data: currentLot } = useQuery<Lot>({
    queryKey: ['/api/lots', lotId],
    enabled: !!lotId,
  });

  // Initialize selectedDevelopmentId from the lot
  useEffect(() => {
    if (currentLot?.developmentId) {
      setSelectedDevelopmentId(currentLot.developmentId);
    }
  }, [currentLot]);

  // Fetch lots for the selected development
  const { data: lots = [], isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ['/api/developments', selectedDevelopmentId, 'lots'],
    enabled: !!selectedDevelopmentId,
  });

  // Auto-fill house specifications when a plan is selected
  useEffect(() => {
    if (planId && plans.length > 0) {
      const selectedPlan = plans.find(p => p.id === planId);
      if (selectedPlan) {
        if (selectedPlan.floorArea) {
          form.setValue('floorArea', parseFloat(selectedPlan.floorArea as any));
        }
        if (selectedPlan.surfaceArea) {
          form.setValue('surfaceArea', parseFloat(selectedPlan.surfaceArea as any));
        }
        if (selectedPlan.houseVolume) {
          form.setValue('houseVolume', parseFloat(selectedPlan.houseVolume as any));
        }
        if (selectedPlan.stories) {
          form.setValue('stories', parseFloat(selectedPlan.stories as any));
        }
      }
    }
  }, [planId, plans, form]);

  // Auto-fill address when a lot is selected
  useEffect(() => {
    if (lotId && lots.length > 0) {
      const selectedLot = lots.find(l => l.id === lotId);
      if (selectedLot && selectedLot.streetAddress) {
        form.setValue('address', selectedLot.streetAddress);
      }
    }
  }, [lotId, lots, form]);

  const handleSubmit = async (data: JobFormValues) => {
    await onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-job">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle data-testid="text-dialog-title">
              {job ? "Edit Job" : "Add New Job"}
            </DialogTitle>
            {job && (
              <AutoSaveIndicator
                isSaving={autoSave.isSaving}
                lastSaved={autoSave.lastSaved}
                error={autoSave.error}
              />
            )}
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 01-23-25_Final 123 Main St" 
                        {...field} 
                        data-testid="input-job-name"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Format: MM-DD-YY_Type Address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Acme HVAC Solutions" 
                        {...field} 
                        data-testid="input-contractor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 1234 Oak Street, Minneapolis, MN 55401" 
                      {...field} 
                      data-testid="input-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="builderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Builder</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('planId', '');
                        form.setValue('lotId', '');
                        setSelectedDevelopmentId('');
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-builder">
                          <SelectValue placeholder="Select a builder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {builders.map((builder) => (
                          <SelectItem key={builder.id} value={builder.id}>
                            {builder.name} - {builder.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Builder Plan (Auto-Fill Specs)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!builderId || plansLoading || plans.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder={
                            !builderId ? "Select builder first" :
                            plansLoading ? "Loading plans..." :
                            plans.length === 0 ? "No plans available" :
                            "Select a plan"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.planName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Optional: Auto-fills house specifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Development (for Lot Selection)</FormLabel>
                <Select
                  value={selectedDevelopmentId}
                  onValueChange={(value) => {
                    setSelectedDevelopmentId(value);
                    form.setValue('lotId', '');
                  }}
                  disabled={!builderId || developmentsLoading || developments.length === 0}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-development">
                      <SelectValue placeholder={
                        !builderId ? "Select builder first" :
                        developmentsLoading ? "Loading developments..." :
                        developments.length === 0 ? "No developments available" :
                        "Select a development"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {developments.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  Optional: Select to choose a specific lot
                </FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="lotId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot (Auto-Fill Address)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedDevelopmentId || lotsLoading || lots.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-lot">
                          <SelectValue placeholder={
                            !selectedDevelopmentId ? "Select development first" :
                            lotsLoading ? "Loading lots..." :
                            lots.length === 0 ? "No lots available" :
                            "Select a lot"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            Lot {lot.lotNumber}
                            {lot.phase && ` - Phase ${lot.phase}`}
                            {lot.streetAddress && ` - ${lot.streetAddress}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Optional: Auto-fills address if available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inspectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Type *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const defaultPrice = getDefaultPricing(value);
                        if (defaultPrice !== undefined) {
                          form.setValue('pricing', defaultPrice);
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-type">
                          <SelectValue placeholder="Select inspection type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="pre-inspection">Pre-Inspection</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Date</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-date-picker"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricing"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-pricing"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="floorArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Area (sq ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 2500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-floor-area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surfaceArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface Area (sq ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 4500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-surface-area"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="houseVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>House Volume (cu ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 20000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-house-volume"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stories</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 2"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-stories"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g., 44.9778"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-latitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g., -93.2650"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ""}
                        data-testid="input-longitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes about this job..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {job ? "Update Job" : "Create Job"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
