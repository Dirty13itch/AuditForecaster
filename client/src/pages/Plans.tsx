import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Pencil, Building2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DashboardCardSkeleton } from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, InsertPlan, Builder } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Form validation schema with positive number constraints
const planFormSchema = z.object({
  builderId: z.string().min(1, "Builder is required"),
  planName: z.string().min(1, "Plan name is required").max(100, "Plan name too long"),
  floorArea: z.coerce.number().positive("Must be positive").optional(),
  surfaceArea: z.coerce.number().positive("Must be positive").optional(),
  houseVolume: z.coerce.number().positive("Must be positive").optional(),
  stories: z.coerce.number().positive("Must be positive").max(10, "Stories must be 10 or less").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

// Phase 6 - DOCUMENT: Default form values ensure controlled inputs
const DEFAULT_FORM_VALUES: PlanFormValues = {
  builderId: "",
  planName: "",
  floorArea: undefined,
  surfaceArea: undefined,
  houseVolume: undefined,
  stories: undefined,
  notes: "",
};

// Phase 6 - DOCUMENT: Filter option for showing all builders
const ALL_BUILDERS_FILTER = "all" as const;

// Phase 2 - BUILD: Main Plans component with comprehensive error handling
function PlansContent() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [selectedBuilderId, setSelectedBuilderId] = useState<string | typeof ALL_BUILDERS_FILTER>(ALL_BUILDERS_FILTER);

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience against transient failures
  // Phase 2 - BUILD: Query for fetching all plans with error state
  const { 
    data: plans = [], 
    isLoading: plansLoading,
    error: plansError,
  } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
    retry: 2,
  });

  // Phase 2 - BUILD: Query for fetching all builders with error state
  const { 
    data: builders = [], 
    isLoading: buildersLoading,
    error: buildersError,
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  // Phase 6 - DOCUMENT: React Hook Form instance with Zod validation
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  // Phase 6 - DOCUMENT: Mutation for creating new plans with optimistic cache invalidation
  const createMutation = useMutation({
    mutationFn: async (data: InsertPlan) => {
      const res = await apiRequest("POST", "/api/plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      setPlanToEdit(null);
      form.reset(DEFAULT_FORM_VALUES);
      toast({
        title: "Success",
        description: "Plan added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add plan",
        variant: "destructive",
      });
    },
  });

  // Phase 6 - DOCUMENT: Mutation for updating existing plans
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPlan> }) => {
      const res = await apiRequest("PATCH", `/api/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      setPlanToEdit(null);
      form.reset(DEFAULT_FORM_VALUES);
      toast({
        title: "Success",
        description: "Plan updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update plan",
        variant: "destructive",
      });
    },
  });

  // Phase 6 - DOCUMENT: Mutation for deleting plans with user confirmation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setPlanToDelete(null);
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete plan",
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation on every render
  // Phase 6 - DOCUMENT: Form submission handler that routes to create or update mutation
  const handleSubmit = useCallback((data: PlanFormValues) => {
    if (planToEdit) {
      updateMutation.mutate({ id: planToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [planToEdit, createMutation, updateMutation]);

  // Phase 3 - OPTIMIZE: useCallback for edit handler
  // Phase 6 - DOCUMENT: Opens dialog with pre-filled form data for editing
  // Phase 5 - HARDEN: Safely converts numeric string fields to numbers
  const handleEdit = useCallback((plan: Plan) => {
    setPlanToEdit(plan);
    form.reset({
      builderId: plan.builderId,
      planName: plan.planName,
      floorArea: plan.floorArea ? Number(plan.floorArea) : undefined,
      surfaceArea: plan.surfaceArea ? Number(plan.surfaceArea) : undefined,
      houseVolume: plan.houseVolume ? Number(plan.houseVolume) : undefined,
      stories: plan.stories ? Number(plan.stories) : undefined,
      notes: plan.notes || "",
    });
    setIsDialogOpen(true);
  }, [form]);

  // Phase 3 - OPTIMIZE: useCallback for add new handler
  // Phase 6 - DOCUMENT: Opens dialog with empty form for creating new plan
  const handleAddNew = useCallback(() => {
    setPlanToEdit(null);
    form.reset(DEFAULT_FORM_VALUES);
    setIsDialogOpen(true);
  }, [form]);

  // Phase 3 - OPTIMIZE: useCallback for delete confirmation handler
  const confirmDelete = useCallback(() => {
    if (planToDelete) {
      deleteMutation.mutate(planToDelete);
    }
  }, [planToDelete, deleteMutation]);

  // Phase 3 - OPTIMIZE: useMemo for expensive computation - groups plans by builder
  // Phase 6 - DOCUMENT: Creates a lookup map of builder ID to their plans for organized display
  // Phase 5 - HARDEN: Safely handles empty plans array
  const plansByBuilder = useMemo(() => {
    return plans.reduce((acc, plan) => {
      if (!acc[plan.builderId]) {
        acc[plan.builderId] = [];
      }
      acc[plan.builderId].push(plan);
      return acc;
    }, {} as Record<string, Plan[]>);
  }, [plans]);

  // Phase 3 - OPTIMIZE: useMemo for filtered builder IDs based on selected filter
  // Phase 6 - DOCUMENT: Returns all builder IDs or just the selected one for filtering
  const filteredBuilderIds = useMemo(() => {
    return selectedBuilderId === ALL_BUILDERS_FILTER 
      ? Object.keys(plansByBuilder)
      : [selectedBuilderId];
  }, [selectedBuilderId, plansByBuilder]);

  // Phase 3 - OPTIMIZE: useMemo for combined loading state
  const isLoading = useMemo(() => 
    plansLoading || buildersLoading, 
    [plansLoading, buildersLoading]
  );

  // Phase 3 - OPTIMIZE: useMemo for combined error state
  const hasAnyError = useMemo(() => 
    plansError || buildersError, 
    [plansError, buildersError]
  );

  // Phase 2 - BUILD: Render error state if any queries failed
  if (hasAnyError) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="container-error-state">
        <Alert variant="destructive" data-testid="alert-query-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Plans</AlertTitle>
          <AlertDescription>
            {plansError?.message || buildersError?.message || "Failed to load plans data. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="container-plans-page">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" data-testid="section-page-header">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary flex-shrink-0" data-testid="icon-page-title" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
                Builder Plans
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-page-description">
                Manage reusable house plans with pre-filled measurements
              </p>
            </div>
          </div>
          <Button
            onClick={handleAddNew}
            className="w-full sm:w-auto"
            data-testid="button-add-plan"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </div>

        {/* Builder Filter */}
        <Card data-testid="card-builder-filter">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="builder-filter" className="whitespace-nowrap" data-testid="label-builder-filter">
                Filter by Builder:
              </Label>
              <Select 
                value={selectedBuilderId} 
                onValueChange={(value) => setSelectedBuilderId(value as string | typeof ALL_BUILDERS_FILTER)}
              >
                <SelectTrigger 
                  id="builder-filter" 
                  className="w-full sm:w-64" 
                  data-testid="select-builder-filter"
                >
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent data-testid="select-content-builder-filter">
                  <SelectItem value={ALL_BUILDERS_FILTER} data-testid="select-item-all-builders">
                    All Builders
                  </SelectItem>
                  {builders.map((builder) => (
                    <SelectItem 
                      key={builder.id} 
                      value={builder.id}
                      data-testid={`select-item-builder-${builder.id}`}
                    >
                      {builder.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Phase 2 - BUILD: Loading skeletons during data fetch */}
        {isLoading ? (
          <div className="space-y-6" data-testid="container-loading-state">
            <DashboardCardSkeleton data-testid="skeleton-plans-1" />
            <DashboardCardSkeleton data-testid="skeleton-plans-2" />
            <DashboardCardSkeleton data-testid="skeleton-plans-3" />
          </div>
        ) : filteredBuilderIds.length === 0 ? (
          // Phase 2 - BUILD: Empty state when no plans exist
          <Card data-testid="card-empty-state">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" data-testid="icon-empty-state" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-state-title">
                No Plans Yet
              </h3>
              <p className="text-muted-foreground mb-4" data-testid="text-empty-state-description">
                Create reusable plans to speed up job creation
              </p>
              <Button onClick={handleAddNew} data-testid="button-add-first-plan">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Phase 6 - DOCUMENT: Plans grouped by builder for organized display
          filteredBuilderIds.map((builderId) => {
            const builder = builders.find((b) => b.id === builderId);
            const builderPlans = plansByBuilder[builderId] || [];

            return (
              <Card key={builderId} data-testid={`card-builder-group-${builderId}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" data-testid={`text-builder-name-${builderId}`}>
                    <Building2 className="h-5 w-5" data-testid={`icon-builder-${builderId}`} />
                    {builder?.companyName || "Unknown Builder"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid={`grid-plans-${builderId}`}>
                    {builderPlans.map((plan) => (
                      <Card key={plan.id} className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base" data-testid={`text-plan-name-${plan.id}`}>
                              {plan.planName}
                            </CardTitle>
                            <div className="flex gap-1" data-testid={`actions-plan-${plan.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(plan)}
                                data-testid={`button-edit-plan-${plan.id}`}
                                aria-label={`Edit ${plan.planName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPlanToDelete(plan.id)}
                                data-testid={`button-delete-plan-${plan.id}`}
                                aria-label={`Delete ${plan.planName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm" data-testid={`details-plan-${plan.id}`}>
                          {plan.floorArea && (
                            <div className="flex justify-between" data-testid={`detail-floor-area-${plan.id}`}>
                              <span className="text-muted-foreground">Floor Area:</span>
                              <span className="font-medium">{plan.floorArea} sq ft</span>
                            </div>
                          )}
                          {plan.surfaceArea && (
                            <div className="flex justify-between" data-testid={`detail-surface-area-${plan.id}`}>
                              <span className="text-muted-foreground">Surface Area:</span>
                              <span className="font-medium">{plan.surfaceArea} sq ft</span>
                            </div>
                          )}
                          {plan.houseVolume && (
                            <div className="flex justify-between" data-testid={`detail-house-volume-${plan.id}`}>
                              <span className="text-muted-foreground">Volume:</span>
                              <span className="font-medium">{plan.houseVolume} cu ft</span>
                            </div>
                          )}
                          {plan.stories && (
                            <div className="flex justify-between" data-testid={`detail-stories-${plan.id}`}>
                              <span className="text-muted-foreground">Stories:</span>
                              <span className="font-medium">{plan.stories}</span>
                            </div>
                          )}
                          {/* Phase 5 - HARDEN: Show indicator when plan has no measurements */}
                          {!plan.floorArea && !plan.surfaceArea && !plan.houseVolume && !plan.stories && (
                            <p className="text-xs text-muted-foreground italic" data-testid={`text-no-measurements-${plan.id}`}>
                              No measurements specified
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-plan-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {planToEdit ? "Edit Plan" : "Add New Plan"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" data-testid="form-plan">
              <FormField
                control={form.control}
                name="builderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-builder">Builder</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan-builder">
                          <SelectValue placeholder="Select a builder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="select-content-plan-builder">
                        {builders.map((builder) => (
                          <SelectItem 
                            key={builder.id} 
                            value={builder.id}
                            data-testid={`select-item-plan-builder-${builder.id}`}
                          >
                            {builder.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="error-builder" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-plan-name">Plan Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Rambler 1800, Two-Story 2400" 
                        {...field} 
                        data-testid="input-plan-name" 
                      />
                    </FormControl>
                    <FormMessage data-testid="error-plan-name" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="floorArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-floor-area">Floor Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="1800" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-floor-area" 
                        />
                      </FormControl>
                      <FormMessage data-testid="error-floor-area" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="surfaceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-surface-area">Surface Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="3200" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-surface-area" 
                        />
                      </FormControl>
                      <FormMessage data-testid="error-surface-area" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="houseVolume"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-house-volume">Volume (cu ft)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="14400" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-house-volume" 
                        />
                      </FormControl>
                      <FormMessage data-testid="error-house-volume" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-stories">Stories</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="1" 
                          {...field} 
                          value={field.value ?? ""} 
                          data-testid="input-stories" 
                        />
                      </FormControl>
                      <FormMessage data-testid="error-stories" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-notes">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Additional details about this plan" 
                        {...field} 
                        data-testid="input-notes" 
                      />
                    </FormControl>
                    <FormMessage data-testid="error-notes" />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-plan"
                >
                  {/* Phase 2 - BUILD: Show loading state during mutation */}
                  {(createMutation.isPending || updateMutation.isPending) 
                    ? "Saving..." 
                    : planToEdit ? "Update Plan" : "Add Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              This will remove the plan template. Existing jobs using this plan will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              data-testid="button-cancel-delete"
              disabled={deleteMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {/* Phase 2 - BUILD: Show loading state during delete */}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for production resilience
export default function Plans() {
  return (
    <ErrorBoundary>
      <PlansContent />
    </ErrorBoundary>
  );
}
