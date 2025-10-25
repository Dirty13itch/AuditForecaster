import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
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
  LayoutGrid,
  Loader2,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Builder, Development, Lot, Plan, InsertLot } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "available", label: "Available", variant: "outline" as const },
  { value: "under_construction", label: "Under Construction", variant: "default" as const },
  { value: "completed", label: "Completed", variant: "secondary" as const },
  { value: "sold", label: "Sold", variant: "default" as const },
  { value: "on_hold", label: "On Hold", variant: "destructive" as const },
];

const lotFormSchema = z.object({
  lotNumber: z.string().min(1, "Lot number is required"),
  phase: z.string().optional(),
  block: z.string().optional(),
  streetAddress: z.string().optional(),
  planId: z.string().optional().nullable(),
  status: z.enum(["available", "under_construction", "completed", "sold", "on_hold"]),
  squareFootage: z.string().optional(),
  notes: z.string().optional(),
});

type LotFormValues = z.infer<typeof lotFormSchema>;

interface LotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  development: Development | null;
  builder: Builder | null;
}

export function LotsDialog({
  open,
  onOpenChange,
  development,
  builder,
}: LotsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [lotToEdit, setLotToEdit] = useState<Lot | null>(null);
  const [lotToDelete, setLotToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: lots = [], isLoading } = useQuery<Lot[]>({
    queryKey: ["/api/developments", development?.id, "lots"],
    enabled: open && !!development,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans/builder", builder?.id],
    enabled: open && !!builder,
  });

  const filteredLots = statusFilter
    ? lots.filter((lot) => lot.status === statusFilter)
    : lots;

  const form = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: {
      lotNumber: "",
      phase: "",
      block: "",
      streetAddress: "",
      planId: null,
      status: "available",
      squareFootage: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLot) => {
      const res = await apiRequest(
        "POST",
        `/api/developments/${development!.id}/lots`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/developments", development?.id, "lots"],
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.length === 3 &&
          query.queryKey[0] === "/api/developments" &&
          query.queryKey[2] === "lots",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setIsAddDialogOpen(false);
      setLotToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Lot added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add lot",
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
      data: Partial<InsertLot>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/developments/${development!.id}/lots/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/developments", development?.id, "lots"],
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.length === 3 &&
          query.queryKey[0] === "/api/developments" &&
          query.queryKey[2] === "lots",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setIsAddDialogOpen(false);
      setLotToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Lot updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lot",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/developments/${development!.id}/lots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/developments", development?.id, "lots"],
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.length === 3 &&
          query.queryKey[0] === "/api/developments" &&
          query.queryKey[2] === "lots",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setLotToDelete(null);
      toast({
        title: "Success",
        description: "Lot deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lot",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setLotToEdit(null);
    form.reset({
      lotNumber: "",
      phase: "",
      block: "",
      streetAddress: "",
      planId: null,
      status: "available",
      squareFootage: "",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (lot: Lot) => {
    setLotToEdit(lot);
    form.reset({
      lotNumber: lot.lotNumber,
      phase: lot.phase || "",
      block: lot.block || "",
      streetAddress: lot.streetAddress || "",
      planId: lot.planId || null,
      status: lot.status as any,
      squareFootage: lot.squareFootage ? String(lot.squareFootage) : "",
      notes: lot.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: LotFormValues) => {
    const lotData: InsertLot = {
      developmentId: development!.id,
      lotNumber: data.lotNumber,
      phase: data.phase || null,
      block: data.block || null,
      streetAddress: data.streetAddress || null,
      planId: data.planId || null,
      status: data.status,
      squareFootage: data.squareFootage ? parseFloat(data.squareFootage) : null,
      notes: data.notes || null,
    };

    if (lotToEdit) {
      await updateMutation.mutateAsync({ id: lotToEdit.id, data: lotData });
    } else {
      await createMutation.mutateAsync(lotData);
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

  const getPlanName = (planId: string | null) => {
    if (!planId) return null;
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : null;
  };

  if (!development) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-development-lots">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Lots - {development.name}
            </DialogTitle>
            <DialogDescription>
              Manage lots within this development
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {filteredLots.length} {filteredLots.length === 1 ? "lot" : "lots"}
                </p>
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddClick}
                size="sm"
                data-testid="button-add-lot"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lot
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredLots.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {statusFilter ? "No lots with this status" : "No lots yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {statusFilter
                      ? "Try changing the status filter"
                      : "Get started by adding your first lot"}
                  </p>
                  {!statusFilter && (
                    <Button onClick={handleAddClick} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lot
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredLots.map((lot) => (
                  <Card key={lot.id} className="hover-elevate">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">Lot {lot.lotNumber}</h3>
                          {getStatusBadge(lot.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {lot.phase && `Phase ${lot.phase}`}
                          {lot.block && ` • Block ${lot.block}`}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(lot)}
                          data-testid={`button-edit-lot-${lot.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLotToDelete(lot.id)}
                          data-testid={`button-delete-lot-${lot.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {lot.streetAddress && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{lot.streetAddress}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {lot.planId && getPlanName(lot.planId) && (
                          <div>
                            <span className="text-muted-foreground">Plan:</span>{" "}
                            <span className="font-medium">{getPlanName(lot.planId)}</span>
                          </div>
                        )}
                        {lot.squareFootage && (
                          <div>
                            <span className="text-muted-foreground">Sq Ft:</span>{" "}
                            <span className="font-medium">
                              {parseFloat(String(lot.squareFootage)).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      {lot.notes && (
                        <div className="text-sm text-muted-foreground pt-2 border-t">
                          {lot.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-lot-form">
          <DialogHeader>
            <DialogTitle>
              {lotToEdit ? "Edit Lot" : "Add Lot"}
            </DialogTitle>
            <DialogDescription>
              {lotToEdit ? "Update lot details" : "Create a new lot"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="lotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="42" data-testid="input-lot-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phase</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1" data-testid="input-phase" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A" data-testid="input-block" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Oak Street" data-testid="input-street-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No plan selected</SelectItem>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
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
              </div>

              <FormField
                control={form.control}
                name="squareFootage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Square Footage</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="1"
                        placeholder="2400"
                        data-testid="input-square-footage"
                      />
                    </FormControl>
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
                        placeholder="Additional lot details..."
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
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {lotToEdit ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!lotToDelete} onOpenChange={() => setLotToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => lotToDelete && deleteMutation.mutate(lotToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
