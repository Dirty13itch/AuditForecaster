import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import { Building, MapPin, FileText, Calendar as CalendarIcon, CheckCircle, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { generateJobName } from "@shared/jobNameGenerator";
import type { Job, Builder, Development, Lot, Plan, PlanOptionalFeature, User, ScheduleEvent } from "@shared/schema";
import { INSPECTION_TYPE_OPTIONS, getDefaultPricing } from "@shared/inspectionTypes";

interface WizardFormData {
  builderId: string;
  developmentId: string;
  lotId: string;
  planId: string;
  scheduledDate: Date | null;
  assignedTo: string;
  inspectionType: string;
  contractor: string;
  floorArea: number;
  houseVolume: number;
  surfaceArea: number;
  stories: number;
  selectedOptionalFeatures: string[];
  adjustedFloorArea: number | null;
  adjustedVolume: number | null;
  adjustedSurfaceArea: number | null;
  pricing: number;
  priority: 'low' | 'medium' | 'high';
  notes: string;
}

interface JobWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJob?: Job | null;
  onSuccess?: () => void;
}

interface StepProps {
  formData: WizardFormData;
  onChange: (data: WizardFormData) => void;
  onNext?: () => void;
}

// Helper function to check schedule conflicts
async function checkScheduleConflicts(date: Date, inspectorId: string): Promise<string[]> {
  try {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    
    // Fetch schedule events for the inspector on that day
    const response = await fetch(
      `/api/schedule-events?assignedTo=${inspectorId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
    
    if (!response.ok) return [];
    
    const events = await response.json();
    const conflicts: string[] = [];
    
    if (events && events.length > 0) {
      conflicts.push(`${events.length} job(s) already scheduled for this inspector on this date`);
      events.forEach((event: ScheduleEvent & { job?: Job }) => {
        if (event.job) {
          conflicts.push(`- ${event.job.name} at ${event.job.address}`);
        }
      });
    }
    
    return conflicts;
  } catch (error) {
    console.error('Failed to check conflicts:', error);
    return [];
  }
}

// Step 1: Select Builder
function BuilderStep({ formData, onChange }: StepProps) {
  const { data: builders = [], isLoading } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
  });

  return (
    <div data-testid="step-builder" className="space-y-4">
      <h3 className="text-lg font-semibold">Select Builder</h3>
      <p className="text-sm text-muted-foreground">Choose the builder for this job</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
        {builders.map((builder) => (
          <Card
            key={builder.id}
            className={cn(
              "cursor-pointer transition-all hover-elevate",
              formData.builderId === builder.id && "ring-2 ring-primary"
            )}
            onClick={() => onChange({ 
              ...formData, 
              builderId: builder.id,
              // Reset dependent fields
              developmentId: '',
              lotId: '',
              planId: ''
            })}
            data-testid={`card-builder-${builder.id}`}
          >
            <CardContent className="p-4">
              <h4 className="font-semibold text-base">{builder.name}</h4>
              <p className="text-sm text-muted-foreground">{builder.companyName}</p>
              {builder.email && (
                <p className="text-xs text-muted-foreground mt-1">{builder.email}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Step 2: Select Development
function DevelopmentStep({ formData, onChange }: StepProps) {
  const { data: developments = [], isLoading } = useQuery<Development[]>({
    queryKey: ['/api/builders', formData.builderId, 'developments'],
    enabled: !!formData.builderId,
  });

  return (
    <div data-testid="step-development" className="space-y-4">
      <h3 className="text-lg font-semibold">Select Development</h3>
      <p className="text-sm text-muted-foreground">Choose the development where the job will take place</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {isLoading && (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
        {!isLoading && developments.length === 0 && (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No developments found for this builder
          </div>
        )}
        {developments.map((dev) => (
          <Card
            key={dev.id}
            className={cn(
              "cursor-pointer hover-elevate",
              formData.developmentId === dev.id && "ring-2 ring-primary"
            )}
            onClick={() => onChange({ 
              ...formData, 
              developmentId: dev.id,
              // Reset dependent fields
              lotId: '',
              planId: ''
            })}
            data-testid={`card-development-${dev.id}`}
          >
            <CardContent className="p-4">
              <h4 className="font-semibold text-base">{dev.name}</h4>
              {dev.municipality && (
                <p className="text-sm text-muted-foreground">{dev.municipality}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{dev.status}</Badge>
                {dev.totalLots && (
                  <Badge variant="outline" className="text-xs">{dev.totalLots} lots</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Step 3: Select Plan and Lot
function PlanStep({ formData, onChange }: StepProps) {
  const { data: lots = [], isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ['/api/developments', formData.developmentId, 'lots'],
    enabled: !!formData.developmentId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/plans/builder', formData.builderId],
    enabled: !!formData.builderId,
  });

  const handlePlanSelect = (plan: Plan) => {
    // Auto-fill measurements and pricing from plan
    onChange({
      ...formData,
      planId: plan.id,
      floorArea: plan.floorArea ? parseFloat(plan.floorArea as any) : 0,
      houseVolume: plan.houseVolume ? parseFloat(plan.houseVolume as any) : 0,
      surfaceArea: plan.surfaceArea ? parseFloat(plan.surfaceArea as any) : 0,
      stories: plan.stories ? parseFloat(plan.stories as any) : 1,
    });
  };

  const handleLotSelect = (lotId: string) => {
    const selectedLot = lots.find(l => l.id === lotId);
    onChange({
      ...formData,
      lotId,
      // Auto-fill contractor from lot address if available
      contractor: selectedLot?.streetAddress || formData.contractor,
    });
  };

  return (
    <div data-testid="step-plan" className="space-y-4">
      <h3 className="text-lg font-semibold">Select Lot and Plan</h3>
      <p className="text-sm text-muted-foreground">Choose the lot and house plan</p>
      
      {/* Lot Selection */}
      <div className="space-y-2">
        <Label>Lot *</Label>
        <Select 
          value={formData.lotId} 
          onValueChange={handleLotSelect}
        >
          <SelectTrigger data-testid="select-lot" className="min-h-12">
            <SelectValue placeholder="Select lot" />
          </SelectTrigger>
          <SelectContent>
            {lotsLoading && <SelectItem value="loading" disabled>Loading lots...</SelectItem>}
            {!lotsLoading && lots.length === 0 && (
              <SelectItem value="none" disabled>No lots available</SelectItem>
            )}
            {lots.map((lot) => (
              <SelectItem key={lot.id} value={lot.id}>
                Lot {lot.lotNumber} {lot.streetAddress && `- ${lot.streetAddress}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plan Selection */}
      <div className="space-y-2">
        <Label>Plan *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto">
          {plansLoading && (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          )}
          {!plansLoading && plans.length === 0 && (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No plans found for this builder
            </div>
          )}
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "cursor-pointer hover-elevate",
                formData.planId === plan.id && "ring-2 ring-primary"
              )}
              onClick={() => handlePlanSelect(plan)}
              data-testid={`card-plan-${plan.id}`}
            >
              <CardContent className="p-4">
                <h4 className="font-semibold text-base">{plan.planName}</h4>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {plan.floorArea && <p>Floor Area: {plan.floorArea} sq ft</p>}
                  {plan.houseVolume && <p>Volume: {plan.houseVolume} cu ft</p>}
                  {plan.stories && <p>Stories: {plan.stories}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 4: Schedule Job
function ScheduleStep({ formData, onChange }: StepProps) {
  const { data: inspectors = [] } = useQuery<User[]>({
    queryKey: ['/api/users/inspectors'],
  });

  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  // Check for conflicts when date/inspector changes
  useEffect(() => {
    if (formData.scheduledDate && formData.assignedTo) {
      setIsCheckingConflicts(true);
      checkScheduleConflicts(formData.scheduledDate, formData.assignedTo)
        .then(setConflicts)
        .finally(() => setIsCheckingConflicts(false));
    } else {
      setConflicts([]);
    }
  }, [formData.scheduledDate, formData.assignedTo]);

  // Fetch travel analysis to detect routing inefficiencies
  const { data: travelWarning } = useQuery({
    queryKey: ['/api/inspector-schedule/travel-analysis', { 
      date: formData.scheduledDate?.toISOString(), 
      inspectorId: formData.assignedTo 
    }],
    enabled: !!formData.scheduledDate && !!formData.assignedTo,
  });

  // Auto-fill pricing based on inspection type
  useEffect(() => {
    if (formData.inspectionType && !formData.pricing) {
      const defaultPricing = getDefaultPricing(formData.inspectionType);
      if (defaultPricing) {
        onChange({ ...formData, pricing: defaultPricing });
      }
    }
  }, [formData.inspectionType]);

  return (
    <div data-testid="step-schedule" className="space-y-4">
      <h3 className="text-lg font-semibold">Schedule Job</h3>
      <p className="text-sm text-muted-foreground">Set the date, inspector, and job details</p>
      
      {/* Date Selection */}
      <div className="space-y-2">
        <Label>Scheduled Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal min-h-12",
                !formData.scheduledDate && "text-muted-foreground"
              )}
              data-testid="input-scheduled-date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.scheduledDate ? format(formData.scheduledDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.scheduledDate || undefined}
              onSelect={(date) => onChange({ ...formData, scheduledDate: date || null })}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Inspector Selection */}
      <div className="space-y-2">
        <Label>Assigned Inspector *</Label>
        <Select 
          value={formData.assignedTo} 
          onValueChange={(assignedTo) => onChange({ ...formData, assignedTo })}
        >
          <SelectTrigger data-testid="select-inspector" className="min-h-12">
            <SelectValue placeholder="Select inspector" />
          </SelectTrigger>
          <SelectContent>
            {inspectors.map((inspector) => (
              <SelectItem key={inspector.id} value={inspector.id}>
                {inspector.firstName} {inspector.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Type Selection */}
      <div className="space-y-2">
        <Label>Inspection Type *</Label>
        <Select 
          value={formData.inspectionType} 
          onValueChange={(inspectionType) => onChange({ ...formData, inspectionType })}
        >
          <SelectTrigger data-testid="select-inspection-type" className="min-h-12">
            <SelectValue placeholder="Select inspection type" />
          </SelectTrigger>
          <SelectContent>
            {INSPECTION_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority Selection */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select 
          value={formData.priority} 
          onValueChange={(priority) => onChange({ ...formData, priority: priority as 'low' | 'medium' | 'high' })}
        >
          <SelectTrigger className="min-h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conflict Warnings */}
      {isCheckingConflicts && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for conflicts...
        </div>
      )}
      {!isCheckingConflicts && conflicts.length > 0 && (
        <Alert variant="destructive" data-testid="alert-conflicts">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Schedule Conflicts Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {conflicts.map((conflict, i) => (
                <li key={i} className="text-sm">{conflict}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Travel Warning */}
      {travelWarning?.hasWarnings && (
        <Alert variant="destructive" data-testid="alert-travel-warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Routing Inefficiency Detected</AlertTitle>
          <AlertDescription>
            This assignment would create a {travelWarning.totalMinutes}+ minute travel day.
            Consider assigning to a different inspector or adjusting the schedule.
          </AlertDescription>
        </Alert>
      )}

      {travelWarning?.hasLongCommutes && !travelWarning?.hasWarnings && (
        <Alert data-testid="alert-travel-notice">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This assignment includes commutes over 30 minutes. Route may be optimized.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Step 5: Review and Create
function ReviewStep({ formData, onChange, onNext }: StepProps & { onStepChange: (step: number) => void }) {
  const { data: builder } = useQuery<Builder>({
    queryKey: ['/api/builders', formData.builderId],
    enabled: !!formData.builderId,
  });

  const { data: developments = [] } = useQuery<Development[]>({
    queryKey: ['/api/builders', formData.builderId, 'developments'],
    enabled: !!formData.builderId,
  });

  const development = developments.find(d => d.id === formData.developmentId);

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['/api/plans/builder', formData.builderId],
    enabled: !!formData.builderId,
  });

  const plan = plans.find(p => p.id === formData.planId);

  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ['/api/developments', formData.developmentId, 'lots'],
    enabled: !!formData.developmentId,
  });

  const lot = lots.find(l => l.id === formData.lotId);

  const { data: inspectors = [] } = useQuery<User[]>({
    queryKey: ['/api/users/inspectors'],
  });

  const inspector = inspectors.find(i => i.id === formData.assignedTo);

  const inspectionTypeLabel = INSPECTION_TYPE_OPTIONS.find(
    opt => opt.value === formData.inspectionType
  )?.label || formData.inspectionType;

  return (
    <div data-testid="step-review" className="space-y-4">
      <h3 className="text-lg font-semibold">Review Job Details</h3>
      <p className="text-sm text-muted-foreground">Review and confirm all information before creating the job</p>
      
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Builder</Label>
              <p className="font-semibold">{builder?.name || 'Not selected'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Development</Label>
              <p className="font-semibold">{development?.name || 'Not selected'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Lot</Label>
              <p className="font-semibold">
                {lot ? `Lot ${lot.lotNumber}${lot.streetAddress ? ` - ${lot.streetAddress}` : ''}` : 'Not selected'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Plan</Label>
              <p className="font-semibold">{plan?.planName || 'Not selected'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Scheduled Date</Label>
              <p className="font-semibold">
                {formData.scheduledDate ? format(formData.scheduledDate, 'PPP') : 'Not set'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Inspector</Label>
              <p className="font-semibold">
                {inspector ? `${inspector.firstName} ${inspector.lastName}` : 'Not selected'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Inspection Type</Label>
              <p className="font-semibold">{inspectionTypeLabel || 'Not selected'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Priority</Label>
              <Badge variant="secondary" className="text-xs">
                {formData.priority}
              </Badge>
            </div>
          </div>

          {/* House Specifications */}
          {(formData.floorArea > 0 || formData.houseVolume > 0) && (
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground text-xs mb-2 block">House Specifications</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {formData.floorArea > 0 && (
                  <div>
                    <span className="text-muted-foreground">Floor Area:</span>{' '}
                    <span className="font-medium">{formData.floorArea} sq ft</span>
                  </div>
                )}
                {formData.houseVolume > 0 && (
                  <div>
                    <span className="text-muted-foreground">Volume:</span>{' '}
                    <span className="font-medium">{formData.houseVolume} cu ft</span>
                  </div>
                )}
                {formData.surfaceArea > 0 && (
                  <div>
                    <span className="text-muted-foreground">Surface Area:</span>{' '}
                    <span className="font-medium">{formData.surfaceArea} sq ft</span>
                  </div>
                )}
                {formData.stories > 0 && (
                  <div>
                    <span className="text-muted-foreground">Stories:</span>{' '}
                    <span className="font-medium">{formData.stories}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing */}
          {formData.pricing > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-muted-foreground text-xs">Estimated Pricing</Label>
              <p className="text-2xl font-bold text-green-600">${formData.pricing.toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JobWizard({ open, onOpenChange, editingJob, onSuccess }: JobWizardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>({
    builderId: editingJob?.builderId || '',
    developmentId: '',
    lotId: editingJob?.lotId || '',
    planId: editingJob?.planId || '',
    scheduledDate: editingJob?.scheduledDate ? new Date(editingJob.scheduledDate) : null,
    assignedTo: '',
    inspectionType: editingJob?.inspectionType || '',
    contractor: editingJob?.contractor || '',
    floorArea: editingJob?.floorArea ? parseFloat(editingJob.floorArea as any) : 0,
    houseVolume: editingJob?.houseVolume ? parseFloat(editingJob.houseVolume as any) : 0,
    surfaceArea: editingJob?.surfaceArea ? parseFloat(editingJob.surfaceArea as any) : 0,
    stories: editingJob?.stories ? parseFloat(editingJob.stories as any) : 1,
    selectedOptionalFeatures: (editingJob?.selectedOptionalFeatures as string[]) || [],
    adjustedFloorArea: editingJob?.adjustedFloorArea ? parseFloat(editingJob.adjustedFloorArea as any) : null,
    adjustedVolume: editingJob?.adjustedVolume ? parseFloat(editingJob.adjustedVolume as any) : null,
    adjustedSurfaceArea: editingJob?.adjustedSurfaceArea ? parseFloat(editingJob.adjustedSurfaceArea as any) : null,
    pricing: editingJob?.pricing ? parseFloat(editingJob.pricing as any) : 0,
    priority: (editingJob?.priority as 'low' | 'medium' | 'high') || 'medium',
    notes: editingJob?.notes || '',
  });

  const steps = [
    { id: 'builder', title: 'Builder', icon: Building },
    { id: 'development', title: 'Development', icon: MapPin },
    { id: 'plan', title: 'Plan', icon: FileText },
    { id: 'schedule', title: 'Schedule', icon: CalendarIcon },
    { id: 'review', title: 'Review', icon: CheckCircle },
  ];

  // Validate each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Builder
        return !!formData.builderId;
      case 1: // Development
        return !!formData.developmentId;
      case 2: // Plan
        return !!formData.lotId && !!formData.planId;
      case 3: // Schedule
        return !!formData.scheduledDate && !!formData.assignedTo && !!formData.inspectionType;
      case 4: // Review
        return true; // Review step is always valid if we got here
      default:
        return false;
    }
  };

  // Check if entire form is valid
  const isFormValid = (): boolean => {
    return formData.builderId !== '' &&
           formData.developmentId !== '' &&
           formData.lotId !== '' &&
           formData.planId !== '' &&
           formData.scheduledDate !== null &&
           formData.assignedTo !== '' &&
           formData.inspectionType !== '';
  };

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: WizardFormData) => {
      // Generate job name
      const lot = await fetch(`/api/lots/${data.lotId}`).then(r => r.json());
      const address = lot?.streetAddress || 'Unknown Address';
      const jobName = data.scheduledDate 
        ? generateJobName(data.scheduledDate, data.inspectionType, address)
        : `${data.inspectionType} - ${address}`;

      const jobData = {
        name: jobName,
        address,
        builderId: data.builderId,
        planId: data.planId,
        lotId: data.lotId,
        contractor: data.contractor,
        inspectionType: data.inspectionType,
        scheduledDate: data.scheduledDate,
        priority: data.priority,
        status: 'scheduled',
        floorArea: data.floorArea,
        surfaceArea: data.surfaceArea,
        houseVolume: data.houseVolume,
        stories: data.stories,
        pricing: data.pricing,
        notes: data.notes,
        selectedOptionalFeatures: data.selectedOptionalFeatures,
        adjustedFloorArea: data.adjustedFloorArea,
        adjustedVolume: data.adjustedVolume,
        adjustedSurfaceArea: data.adjustedSurfaceArea,
        fieldWorkComplete: false,
        photoUploadComplete: false,
      };

      return apiRequest('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      toast({
        title: 'Success',
        description: 'Job created successfully',
      });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setCurrentStep(0);
      setFormData({
        builderId: '',
        developmentId: '',
        lotId: '',
        planId: '',
        scheduledDate: null,
        assignedTo: '',
        inspectionType: '',
        contractor: '',
        floorArea: 0,
        houseVolume: 0,
        surfaceArea: 0,
        stories: 1,
        selectedOptionalFeatures: [],
        adjustedFloorArea: null,
        adjustedVolume: null,
        adjustedSurfaceArea: null,
        pricing: 0,
        priority: 'medium',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create job',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (isFormValid()) {
      createJobMutation.mutate(formData);
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-job-wizard">
        <DialogHeader>
          <DialogTitle>
            {editingJob ? 'Edit Job' : 'Create New Job'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-2 overflow-x-auto" data-testid="wizard-progress">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-primary text-white",
                      !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                    )}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium text-center">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "w-12 h-0.5 mx-2 transition-colors",
                      isCompleted ? "bg-green-500" : "bg-gray-300"
                    )} 
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-1">
          {currentStep === 0 && <BuilderStep formData={formData} onChange={setFormData} />}
          {currentStep === 1 && <DevelopmentStep formData={formData} onChange={setFormData} />}
          {currentStep === 2 && <PlanStep formData={formData} onChange={setFormData} />}
          {currentStep === 3 && <ScheduleStep formData={formData} onChange={setFormData} />}
          {currentStep === 4 && <ReviewStep formData={formData} onChange={setFormData} onStepChange={setCurrentStep} />}
        </div>

        {/* Navigation Buttons */}
        <DialogFooter className="flex flex-row justify-between items-center border-t pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            data-testid="button-wizard-back"
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="button-wizard-cancel"
            >
              Cancel
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                data-testid="button-wizard-next"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid() || createJobMutation.isPending}
                data-testid="button-wizard-submit"
              >
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
