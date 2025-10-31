import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  FileText,
  Loader2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Builder, BuilderAgreement, InsertBuilderAgreement } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", variant: "default" as const },
  { value: "expired", label: "Expired", variant: "secondary" as const },
  { value: "terminated", label: "Terminated", variant: "destructive" as const },
  { value: "pending", label: "Pending", variant: "outline" as const },
];

const INSPECTION_TYPES = [
  { id: "final", label: "Final Testing" },
  { id: "rough", label: "Pre-Drywall Inspection" },
  { id: "duct_test", label: "Duct Testing" },
];

const agreementFormSchema = z.object({
  agreementName: z.string().min(1, "Agreement name is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional().nullable(),
  status: z.enum(["active", "expired", "terminated", "pending"]),
  defaultInspectionPrice: z.string().optional(),
  paymentTerms: z.string().optional(),
  inspectionTypesIncluded: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

type AgreementFormValues = z.infer<typeof agreementFormSchema>;

interface BuilderAgreementsTabProps {
  builder: Builder;
}

export function BuilderAgreementsTab({ builder }: BuilderAgreementsTabProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [agreementToEdit, setAgreementToEdit] = useState<BuilderAgreement | null>(null);
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(null);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  const { data: agreements = [], isLoading } = useQuery<BuilderAgreement[]>({
    queryKey: ["/api/builders", builder.id, "agreements"],
    retry: 2,
  });

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: {
      agreementName: "",
      startDate: new Date(),
      endDate: null,
      status: "active",
      defaultInspectionPrice: "",
      paymentTerms: "",
      inspectionTypesIncluded: [],
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderAgreement) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder.id}/agreements`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "agreements"],
      });
      setIsAddDialogOpen(false);
      setAgreementToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Agreement added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add agreement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InsertBuilderAgreement>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder.id}/agreements/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "agreements"],
      });
      setIsAddDialogOpen(false);
      setAgreementToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Agreement updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update agreement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builder.id}/agreements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "agreements"],
      });
      setAgreementToDelete(null);
      toast({
        title: "Success",
        description: "Agreement deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agreement",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setAgreementToEdit(null);
    form.reset({
      agreementName: "",
      startDate: new Date(),
      endDate: null,
      status: "active",
      defaultInspectionPrice: "",
      paymentTerms: "",
      inspectionTypesIncluded: [],
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (agreement: BuilderAgreement) => {
    setAgreementToEdit(agreement);
    form.reset({
      agreementName: agreement.agreementName,
      startDate: new Date(agreement.startDate),
      endDate: agreement.endDate ? new Date(agreement.endDate) : null,
      status: agreement.status as "active" | "expired" | "terminated" | "pending",
      defaultInspectionPrice: agreement.defaultInspectionPrice || "",
      paymentTerms: agreement.paymentTerms || "",
      inspectionTypesIncluded: agreement.inspectionTypesIncluded || [],
      notes: agreement.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: AgreementFormValues) => {
    const agreementData: InsertBuilderAgreement = {
      builderId: builder.id,
      agreementName: data.agreementName,
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: data.status,
      defaultInspectionPrice: data.defaultInspectionPrice || null,
      paymentTerms: data.paymentTerms || null,
      inspectionTypesIncluded: data.inspectionTypesIncluded,
      notes: data.notes || null,
    };

    if (agreementToEdit) {
      await updateMutation.mutateAsync({ id: agreementToEdit.id, data: agreementData });
    } else {
      await createMutation.mutateAsync(agreementData);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge variant={statusOption?.variant || "default"} data-testid={`badge-status-${status}`}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const getExpirationBadge = (endDate: string | null) => {
    if (!endDate) return null;

    const daysUntilExpiration = differenceInDays(new Date(endDate), new Date());

    if (daysUntilExpiration <= 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </Badge>
      );
    } else if (daysUntilExpiration <= 30) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical ({daysUntilExpiration}d)
        </Badge>
      );
    } else if (daysUntilExpiration <= 60) {
      return (
        <Badge className="gap-1 bg-yellow-500 text-white">
          <AlertTriangle className="h-3 w-3" />
          Warning ({daysUntilExpiration}d)
        </Badge>
      );
    } else if (daysUntilExpiration <= 90) {
      return (
        <Badge className="gap-1 bg-blue-500 text-white">
          Notice ({daysUntilExpiration}d)
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1">
          OK ({daysUntilExpiration}d)
        </Badge>
      );
    }
  };

  // Sort agreements by end date (soonest first)
  const sortedAgreements = [...agreements].sort((a, b) => {
    if (!a.endDate && !b.endDate) return 0;
    if (!a.endDate) return 1;
    if (!b.endDate) return -1;
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Agreements</h2>
            <p className="text-muted-foreground">
              Manage contract agreements and pricing terms for {builder.name}
            </p>
          </div>
          <Button onClick={handleAddClick} data-testid="button-add-agreement">
            <Plus className="h-4 w-4 mr-2" />
            Add Agreement
          </Button>
        </div>

        {sortedAgreements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Agreements</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                No agreements found. Add your first agreement to get started.
              </p>
              <Button onClick={handleAddClick} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Agreement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedAgreements.map((agreement) => (
              <Card key={agreement.id} className="hover-elevate" data-testid={`card-agreement-${agreement.id}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-lg">{agreement.agreementName}</h3>
                      {getStatusBadge(agreement.status)}
                      {getExpirationBadge(agreement.endDate)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(agreement.startDate), "MMM d, yyyy")}
                      {agreement.endDate && ` - ${format(new Date(agreement.endDate), "MMM d, yyyy")}`}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditClick(agreement)}
                      data-testid={`button-edit-agreement-${agreement.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setAgreementToDelete(agreement.id)}
                      data-testid={`button-delete-agreement-${agreement.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agreement.defaultInspectionPrice && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        ${parseFloat(agreement.defaultInspectionPrice).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">default inspection price</span>
                    </div>
                  )}
                  {agreement.paymentTerms && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Payment Terms:</span>{" "}
                      {agreement.paymentTerms}
                    </div>
                  )}
                  {agreement.inspectionTypesIncluded && agreement.inspectionTypesIncluded.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {agreement.inspectionTypesIncluded.map((type) => (
                        <Badge key={type} variant="outline">
                          {INSPECTION_TYPES.find(t => t.id === type)?.label || type}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {agreement.notes && (
                    <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                      {agreement.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-agreement-form">
          <DialogHeader>
            <DialogTitle>
              {agreementToEdit ? "Edit Agreement" : "Add Agreement"}
            </DialogTitle>
            <DialogDescription>
              {agreementToEdit ? "Update agreement details" : "Create a new agreement"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="agreementName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agreement Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2025 Master Service Agreement" data-testid="input-agreement-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-start-date"
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                              setIsStartDateOpen(false);
                            }}
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-end-date"
                            >
                              {field.value ? format(field.value, "PPP") : "No end date"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={(date) => {
                              field.onChange(date || null);
                              setIsEndDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="defaultInspectionPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Inspection Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="350.00"
                            className="pl-8"
                            data-testid="input-price"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Net 30" data-testid="input-payment-terms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inspectionTypesIncluded"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Inspection Types Included</FormLabel>
                      <FormDescription>
                        Select all inspection types covered by this agreement
                      </FormDescription>
                    </div>
                    <div className="space-y-2">
                      {INSPECTION_TYPES.map((type) => (
                        <FormField
                          key={type.id}
                          control={form.control}
                          name="inspectionTypesIncluded"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={type.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(type.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, type.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== type.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {type.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes..."
                        rows={3}
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
                  variant="secondary"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-agreement"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-agreement"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!agreementToDelete}
        onOpenChange={(open) => !open && setAgreementToDelete(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-agreement-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agreement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => agreementToDelete && deleteMutation.mutate(agreementToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
