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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
  Award,
  Loader2,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Builder, BuilderProgram, InsertBuilderProgram } from "@shared/schema";

const STATUS_OPTIONS = [
  { value: "active", label: "Active", variant: "default" as const },
  { value: "inactive", label: "Inactive", variant: "secondary" as const },
  { value: "suspended", label: "Suspended", variant: "destructive" as const },
];

const PROGRAM_TYPE_OPTIONS = [
  { value: "tax_credit", label: "Tax Credit" },
  { value: "energy_star", label: "ENERGY STAR" },
  { value: "utility_rebate", label: "Utility Rebate" },
  { value: "certification", label: "Certification" },
  { value: "other", label: "Other" },
];

const programFormSchema = z.object({
  programName: z.string().min(1, "Program name is required"),
  programType: z.enum(["tax_credit", "energy_star", "utility_rebate", "certification", "other"]),
  enrollmentDate: z.date({ required_error: "Enrollment date is required" }),
  expirationDate: z.date().optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]),
  certificationNumber: z.string().optional(),
  rebateAmount: z.string().optional(),
  requiresDocumentation: z.boolean().default(true),
  notes: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

interface BuilderProgramsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
}

export function BuilderProgramsDialog({
  open,
  onOpenChange,
  builder,
}: BuilderProgramsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<BuilderProgram | null>(null);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isEnrollmentDateOpen, setIsEnrollmentDateOpen] = useState(false);
  const [isExpirationDateOpen, setIsExpirationDateOpen] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const { data: programs = [], isLoading } = useQuery<BuilderProgram[]>({
    queryKey: ["/api/builders", builder?.id, "programs"],
    enabled: open && !!builder,
  });

  const filteredPrograms = showActiveOnly
    ? programs.filter((p) => p.status === "active")
    : programs;

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      programName: "",
      programType: "tax_credit",
      enrollmentDate: new Date(),
      expirationDate: null,
      status: "active",
      certificationNumber: "",
      rebateAmount: "",
      requiresDocumentation: true,
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderProgram) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder!.id}/programs`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "programs"],
      });
      setIsAddDialogOpen(false);
      setProgramToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Program added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add program",
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
      data: Partial<InsertBuilderProgram>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder!.id}/programs/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "programs"],
      });
      setIsAddDialogOpen(false);
      setProgramToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Program updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update program",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builder!.id}/programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "programs"],
      });
      setProgramToDelete(null);
      toast({
        title: "Success",
        description: "Program deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete program",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setProgramToEdit(null);
    form.reset({
      programName: "",
      programType: "tax_credit",
      enrollmentDate: new Date(),
      expirationDate: null,
      status: "active",
      certificationNumber: "",
      rebateAmount: "",
      requiresDocumentation: true,
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (program: BuilderProgram) => {
    setProgramToEdit(program);
    form.reset({
      programName: program.programName,
      programType: program.programType as any,
      enrollmentDate: new Date(program.enrollmentDate),
      expirationDate: program.expirationDate ? new Date(program.expirationDate) : null,
      status: program.status as "active" | "inactive" | "suspended",
      certificationNumber: program.certificationNumber || "",
      rebateAmount: program.rebateAmount || "",
      requiresDocumentation: program.requiresDocumentation,
      notes: program.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: ProgramFormValues) => {
    const programData: InsertBuilderProgram = {
      builderId: builder!.id,
      programName: data.programName,
      programType: data.programType,
      enrollmentDate: data.enrollmentDate,
      expirationDate: data.expirationDate || null,
      status: data.status,
      certificationNumber: data.certificationNumber || null,
      rebateAmount: data.rebateAmount || null,
      requiresDocumentation: data.requiresDocumentation,
      notes: data.notes || null,
    };

    if (programToEdit) {
      await updateMutation.mutateAsync({ id: programToEdit.id, data: programData });
    } else {
      await createMutation.mutateAsync(programData);
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

  const getProgramTypeBadge = (type: string) => {
    const typeOption = PROGRAM_TYPE_OPTIONS.find(t => t.value === type);
    return (
      <Badge variant="outline" data-testid={`badge-type-${type}`}>
        {typeOption?.label || type}
      </Badge>
    );
  };

  if (!builder) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-builder-programs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Programs - {builder.name}
            </DialogTitle>
            <DialogDescription>
              Manage program enrollments and certifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  {filteredPrograms.length} {filteredPrograms.length === 1 ? "program" : "programs"}
                </p>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-active"
                    checked={showActiveOnly}
                    onCheckedChange={(checked) => setShowActiveOnly(checked as boolean)}
                    data-testid="checkbox-show-active"
                  />
                  <label htmlFor="show-active" className="text-sm cursor-pointer">
                    Show active only
                  </label>
                </div>
              </div>
              <Button
                onClick={handleAddClick}
                size="sm"
                data-testid="button-add-program"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Program
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
            ) : filteredPrograms.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {showActiveOnly ? "No active programs" : "No programs yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {showActiveOnly
                      ? "This builder has no active program enrollments"
                      : "Get started by adding your first program"}
                  </p>
                  {!showActiveOnly && (
                    <Button onClick={handleAddClick} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Program
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredPrograms.map((program) => (
                  <Card key={program.id} className="hover-elevate">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{program.programName}</h3>
                          {getProgramTypeBadge(program.programType)}
                          {getStatusBadge(program.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Enrolled: {format(new Date(program.enrollmentDate), "MMM d, yyyy")}
                          {program.expirationDate && ` • Expires: ${format(new Date(program.expirationDate), "MMM d, yyyy")}`}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(program)}
                          data-testid={`button-edit-program-${program.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setProgramToDelete(program.id)}
                          data-testid={`button-delete-program-${program.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-4 text-sm">
                        {program.certificationNumber && (
                          <div>
                            <span className="text-muted-foreground">Cert #:</span>{" "}
                            <span className="font-medium">{program.certificationNumber}</span>
                          </div>
                        )}
                        {program.rebateAmount && (
                          <div>
                            <span className="text-muted-foreground">Rebate:</span>{" "}
                            <span className="font-medium">
                              ${parseFloat(program.rebateAmount).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {program.requiresDocumentation && (
                          <Badge variant="outline" className="h-6">
                            Documentation Required
                          </Badge>
                        )}
                      </div>
                      {program.notes && (
                        <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                          {program.notes}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-program-form">
          <DialogHeader>
            <DialogTitle>
              {programToEdit ? "Edit Program" : "Add Program"}
            </DialogTitle>
            <DialogDescription>
              {programToEdit ? "Update program details" : "Enroll in a new program"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="programName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="45L Tax Credit Program" data-testid="input-program-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="programType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-program-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROGRAM_TYPE_OPTIONS.map((option) => (
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="enrollmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enrollment Date</FormLabel>
                      <Popover open={isEnrollmentDateOpen} onOpenChange={setIsEnrollmentDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-enrollment-date"
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
                              setIsEnrollmentDateOpen(false);
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
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <Popover open={isExpirationDateOpen} onOpenChange={setIsExpirationDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-expiration-date"
                            >
                              {field.value ? format(field.value, "PPP") : "No expiration"}
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
                              setIsExpirationDateOpen(false);
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
                  name="certificationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certification Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="CERT-2025-12345" data-testid="input-cert-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rebateAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rebate Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            className="pl-8"
                            data-testid="input-rebate-amount"
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
                name="requiresDocumentation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-requires-docs"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Requires Documentation
                      </FormLabel>
                      <FormDescription>
                        Check if this program requires supporting documentation
                      </FormDescription>
                    </div>
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
                        placeholder="Additional program details..."
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
                  {programToEdit ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!programToDelete} onOpenChange={() => setProgramToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => programToDelete && deleteMutation.mutate(programToDelete)}
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
