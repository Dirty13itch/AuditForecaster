import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import type { Job, Builder } from "@shared/schema";

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
  contractor: z.string().min(1, "Contractor is required"),
  inspectionType: z.string().min(1, "Inspection type is required"),
  pricing: z.number().optional(),
  scheduledDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.string().default("pending"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      name: job?.name || "",
      address: job?.address || "",
      builderId: job?.builderId || "",
      contractor: job?.contractor || "",
      inspectionType: job?.inspectionType || "",
      pricing: job?.pricing ? parseFloat(job.pricing as any) : undefined,
      scheduledDate: job?.scheduledDate ? new Date(job.scheduledDate) : undefined,
      priority: (job?.priority as "low" | "medium" | "high") || "medium",
      status: job?.status || "pending",
      latitude: job?.latitude || undefined,
      longitude: job?.longitude || undefined,
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
                        placeholder="e.g., Johnson Residence" 
                        {...field} 
                        data-testid="input-job-name"
                      />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
