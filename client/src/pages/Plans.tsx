import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Plan, InsertPlan, Builder } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const planFormSchema = z.object({
  builderId: z.string().min(1, "Builder is required"),
  planName: z.string().min(1, "Plan name is required"),
  floorArea: z.coerce.number().positive("Must be positive").optional(),
  surfaceArea: z.coerce.number().positive("Must be positive").optional(),
  houseVolume: z.coerce.number().positive("Must be positive").optional(),
  stories: z.coerce.number().positive("Must be positive").optional(),
  notes: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

export default function Plans() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [selectedBuilderId, setSelectedBuilderId] = useState<string | "all">("all");

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      builderId: "",
      planName: "",
      floorArea: undefined,
      surfaceArea: undefined,
      houseVolume: undefined,
      stories: undefined,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPlan) => {
      const res = await apiRequest("POST", "/api/plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      setPlanToEdit(null);
      form.reset();
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPlan> }) => {
      const res = await apiRequest("PATCH", `/api/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDialogOpen(false);
      setPlanToEdit(null);
      form.reset();
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

  const handleSubmit = (data: PlanFormValues) => {
    if (planToEdit) {
      updateMutation.mutate({ id: planToEdit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (plan: Plan) => {
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
  };

  const handleAddNew = () => {
    setPlanToEdit(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (planToDelete) {
      deleteMutation.mutate(planToDelete);
    }
  };

  // Group plans by builder
  const plansByBuilder = plans.reduce((acc, plan) => {
    if (!acc[plan.builderId]) {
      acc[plan.builderId] = [];
    }
    acc[plan.builderId].push(plan);
    return acc;
  }, {} as Record<string, Plan[]>);

  // Filter by selected builder
  const filteredBuilderIds = selectedBuilderId === "all" 
    ? Object.keys(plansByBuilder)
    : [selectedBuilderId];

  const isLoading = plansLoading || buildersLoading;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
                Builder Plans
              </h1>
              <p className="text-sm text-muted-foreground">
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="builder-filter" className="whitespace-nowrap">Filter by Builder:</Label>
              <Select value={selectedBuilderId} onValueChange={(value) => setSelectedBuilderId(value as string | "all")}>
                <SelectTrigger id="builder-filter" className="w-full sm:w-64" data-testid="select-builder-filter">
                  <SelectValue placeholder="All Builders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builders</SelectItem>
                  {builders.map((builder) => (
                    <SelectItem key={builder.id} value={builder.id}>
                      {builder.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Plans by Builder */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading plans...</div>
        ) : filteredBuilderIds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Plans Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create reusable plans to speed up job creation
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredBuilderIds.map((builderId) => {
            const builder = builders.find((b) => b.id === builderId);
            const builderPlans = plansByBuilder[builderId] || [];

            return (
              <Card key={builderId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {builder?.companyName || "Unknown Builder"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {builderPlans.map((plan) => (
                      <Card key={plan.id} className="hover-elevate" data-testid={`card-plan-${plan.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{plan.planName}</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(plan)}
                                data-testid={`button-edit-plan-${plan.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPlanToDelete(plan.id)}
                                data-testid={`button-delete-plan-${plan.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {plan.floorArea && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Floor Area:</span>
                              <span className="font-medium">{plan.floorArea} sq ft</span>
                            </div>
                          )}
                          {plan.surfaceArea && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Surface Area:</span>
                              <span className="font-medium">{plan.surfaceArea} sq ft</span>
                            </div>
                          )}
                          {plan.houseVolume && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Volume:</span>
                              <span className="font-medium">{plan.houseVolume} cu ft</span>
                            </div>
                          )}
                          {plan.stories && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Stories:</span>
                              <span className="font-medium">{plan.stories}</span>
                            </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planToEdit ? "Edit Plan" : "Add New Plan"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="builderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Builder</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plan-builder">
                          <SelectValue placeholder="Select a builder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {builders.map((builder) => (
                          <SelectItem key={builder.id} value={builder.id}>
                            {builder.companyName}
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
                name="planName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Rambler 1800, Two-Story 2400" {...field} data-testid="input-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="floorArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="1800" {...field} value={field.value ?? ""} data-testid="input-floor-area" />
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
                        <Input type="number" step="0.01" placeholder="3200" {...field} value={field.value ?? ""} data-testid="input-surface-area" />
                      </FormControl>
                      <FormMessage />
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
                      <FormLabel>Volume (cu ft)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="14400" {...field} value={field.value ?? ""} data-testid="input-house-volume" />
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
                        <Input type="number" step="0.1" placeholder="1" {...field} value={field.value ?? ""} data-testid="input-stories" />
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Additional details about this plan" {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-plan"
                >
                  {planToEdit ? "Update Plan" : "Add Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!planToDelete} onOpenChange={() => setPlanToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the plan template. Existing jobs using this plan will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
