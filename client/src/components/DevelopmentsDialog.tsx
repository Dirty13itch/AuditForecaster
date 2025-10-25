import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Building2,
  Loader2,
  MapPin,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { LotsDialog } from "@/components/LotsDialog";
import type { Builder, Development, Lot, InsertDevelopment } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning", variant: "outline" as const },
  { value: "active", label: "Active", variant: "default" as const },
  { value: "completed", label: "Completed", variant: "secondary" as const },
  { value: "on_hold", label: "On Hold", variant: "destructive" as const },
];

const developmentFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  region: z.string().optional(),
  municipality: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["planning", "active", "completed", "on_hold"]),
  startDate: z.date().optional().nullable(),
  targetCompletionDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type DevelopmentFormValues = z.infer<typeof developmentFormSchema>;

interface DevelopmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
}

export function DevelopmentsDialog({
  open,
  onOpenChange,
  builder,
}: DevelopmentsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [developmentToEdit, setDevelopmentToEdit] = useState<Development | null>(null);
  const [developmentToDelete, setDevelopmentToDelete] = useState<string | null>(null);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isTargetDateOpen, setIsTargetDateOpen] = useState(false);
  const [lotsDialogOpen, setLotsDialogOpen] = useState(false);
  const [selectedDevelopment, setSelectedDevelopment] = useState<Development | null>(null);

  const { data: developments = [], isLoading } = useQuery<Development[]>({
    queryKey: ["/api/builders", builder?.id, "developments"],
    enabled: open && !!builder,
  });

  // Fetch lots for each development to show counts
  const { data: allLots = [] } = useQuery<Lot[]>({
    queryKey: ["/api/developments", "all-lots"],
    queryFn: async () => {
      const lotsByDevelopment = await Promise.all(
        developments.map(async (dev) => {
          const res = await fetch(`/api/developments/${dev.id}/lots`, {
            credentials: "include",
          });
          if (res.ok) {
            return res.json();
          }
          return [];
        })
      );
      return lotsByDevelopment.flat();
    },
    enabled: open && developments.length > 0,
  });

  const form = useForm<DevelopmentFormValues>({
    resolver: zodResolver(developmentFormSchema),
    defaultValues: {
      name: "",
      region: "",
      municipality: "",
      address: "",
      status: "planning",
      startDate: null,
      targetCompletionDate: null,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDevelopment) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder!.id}/developments`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setIsAddDialogOpen(false);
      setDevelopmentToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Development added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add development",
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
      data: Partial<InsertDevelopment>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder!.id}/developments/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setIsAddDialogOpen(false);
      setDevelopmentToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Development updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update development",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builder!.id}/developments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "developments"],
      });
      setDevelopmentToDelete(null);
      toast({
        title: "Success",
        description: "Development deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete development",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setDevelopmentToEdit(null);
    form.reset({
      name: "",
      region: "",
      municipality: "",
      address: "",
      status: "planning",
      startDate: null,
      targetCompletionDate: null,
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (development: Development) => {
    setDevelopmentToEdit(development);
    form.reset({
      name: development.name,
      region: development.region || "",
      municipality: development.municipality || "",
      address: development.address || "",
      status: development.status as any,
      startDate: development.startDate ? new Date(development.startDate) : null,
      targetCompletionDate: development.targetCompletionDate
        ? new Date(development.targetCompletionDate)
        : null,
      notes: development.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleManageLotsClick = (development: Development) => {
    setSelectedDevelopment(development);
    setLotsDialogOpen(true);
  };

  const handleSubmit = async (data: DevelopmentFormValues) => {
    const developmentData: InsertDevelopment = {
      builderId: builder!.id,
      name: data.name,
      region: data.region || null,
      municipality: data.municipality || null,
      address: data.address || null,
      status: data.status,
      startDate: data.startDate || null,
      targetCompletionDate: data.targetCompletionDate || null,
      notes: data.notes || null,
    };

    if (developmentToEdit) {
      await updateMutation.mutateAsync({ id: developmentToEdit.id, data: developmentData });
    } else {
      await createMutation.mutateAsync(developmentData);
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

  const getLotCount = (developmentId: string) => {
    const lots = allLots.filter(lot => lot.developmentId === developmentId);
    const completedLots = lots.filter(lot => lot.status === "completed");
    return { total: lots.length, completed: completedLots.length };
  };

  if (!builder) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-builder-developments">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Developments - {builder.name}
            </DialogTitle>
            <DialogDescription>
              Manage builder developments and subdivisions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {developments.length} {developments.length === 1 ? "development" : "developments"}
              </p>
              <Button
                onClick={handleAddClick}
                size="sm"
                data-testid="button-add-development"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Development
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
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
            ) : developments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No developments yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get started by adding your first development
                  </p>
                  <Button onClick={handleAddClick} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Development
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {developments.map((development) => {
                  const lotCount = getLotCount(development.id);
                  return (
                    <Card key={development.id} className="hover-elevate">
                      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{development.name}</h3>
                            {getStatusBadge(development.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                            {development.region && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {development.region}
                              </div>
                            )}
                            {development.municipality && (
                              <span>• {development.municipality}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(development)}
                            data-testid={`button-edit-development-${development.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDevelopmentToDelete(development.id)}
                            data-testid={`button-delete-development-${development.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {development.address && (
                          <div className="text-sm text-muted-foreground">
                            {development.address}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-4 text-sm">
                            {development.startDate && (
                              <div>
                                <span className="text-muted-foreground">Started:</span>{" "}
                                {format(new Date(development.startDate), "MMM yyyy")}
                              </div>
                            )}
                            {development.targetCompletionDate && (
                              <div>
                                <span className="text-muted-foreground">Target:</span>{" "}
                                {format(new Date(development.targetCompletionDate), "MMM yyyy")}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {lotCount.completed}/{lotCount.total}
                              </span>
                              <span className="text-muted-foreground">lots completed</span>
                            </div>
                            <Button
                              onClick={() => handleManageLotsClick(development)}
                              size="sm"
                              variant="outline"
                              data-testid={`button-manage-lots-${development.id}`}
                            >
                              <LayoutGrid className="h-4 w-4 mr-2" />
                              Manage Lots
                            </Button>
                          </div>
                        </div>
                        {development.notes && (
                          <div className="text-sm text-muted-foreground pt-2 border-t">
                            {development.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-development-form">
          <DialogHeader>
            <DialogTitle>
              {developmentToEdit ? "Edit Development" : "Add Development"}
            </DialogTitle>
            <DialogDescription>
              {developmentToEdit ? "Update development details" : "Create a new development"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Development Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Meadowbrook Estates" data-testid="input-development-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="North County" data-testid="input-region" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipality</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Springfield" data-testid="input-municipality" />
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
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main Street" data-testid="input-address" />
                    </FormControl>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date (Optional)</FormLabel>
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
                            selected={field.value || undefined}
                            onSelect={(date) => {
                              field.onChange(date || null);
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
                  name="targetCompletionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Completion (Optional)</FormLabel>
                      <Popover open={isTargetDateOpen} onOpenChange={setIsTargetDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-target-date"
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                              setIsTargetDateOpen(false);
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional development details..."
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
                  {developmentToEdit ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!developmentToDelete} onOpenChange={() => setDevelopmentToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Development</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this development? This will also delete all associated lots. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => developmentToDelete && deleteMutation.mutate(developmentToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedDevelopment && (
        <LotsDialog
          open={lotsDialogOpen}
          onOpenChange={setLotsDialogOpen}
          development={selectedDevelopment}
          builder={builder}
        />
      )}
    </>
  );
}
