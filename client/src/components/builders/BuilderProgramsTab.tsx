import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
import { Plus, Edit, Trash2, Award, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Builder, BuilderProgram, InsertBuilderProgram } from "@shared/schema";

const PROGRAM_STATUSES = [
  { value: "active", label: "Active", variant: "default" as const },
  { value: "inactive", label: "Inactive", variant: "outline" as const },
  { value: "suspended", label: "Suspended", variant: "destructive" as const },
];

const programFormSchema = z.object({
  programName: z.string().min(1, "Program name is required"),
  programType: z.string(),
  enrollmentDate: z.date(),
  expirationDate: z.date().optional(),
  status: z.enum(["active", "inactive", "suspended"]),
  certificationLevel: z.string().optional(),
  notes: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

interface BuilderProgramsTabProps {
  builder: Builder;
}

export function BuilderProgramsTab({ builder }: BuilderProgramsTabProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<BuilderProgram | null>(null);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [isEnrollmentDateOpen, setIsEnrollmentDateOpen] = useState(false);
  const [isExpirationDateOpen, setIsExpirationDateOpen] = useState(false);

  const { data: programs = [], isLoading } = useQuery<BuilderProgram[]>({
    queryKey: ["/api/builders", builder.id, "programs"],
    retry: 2,
  });

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: {
      programName: "",
      programType: "",
      enrollmentDate: new Date(),
      expirationDate: null,
      status: "active",
      certificationLevel: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderProgram) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder.id}/programs`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "programs"],
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
        `/api/builders/${builder.id}/programs/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "programs"],
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
      await apiRequest("DELETE", `/api/builders/${builder.id}/programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "programs"],
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
      programType: "",
      enrollmentDate: new Date(),
      expirationDate: null,
      status: "active",
      certificationLevel: "",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (program: BuilderProgram) => {
    setProgramToEdit(program);
    form.reset({
      programName: program.programName,
      programType: program.programType,
      enrollmentDate: new Date(program.enrollmentDate),
      expirationDate: program.expirationDate ? new Date(program.expirationDate) : null,
      status: program.status as "active" | "inactive" | "suspended",
      certificationLevel: program.certificationLevel || "",
      notes: program.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: ProgramFormValues) => {
    const programData: InsertBuilderProgram = {
      builderId: builder.id,
      programName: data.programName,
      programType: data.programType,
      enrollmentDate: data.enrollmentDate,
      expirationDate: data.expirationDate || null,
      status: data.status,
      certificationLevel: data.certificationLevel || null,
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

  // Filter active vs inactive programs
  const activePrograms = programs.filter(p => p.status === "active");
  const inactivePrograms = programs.filter(p => p.status !== "active");

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
            <h2 className="text-2xl font-bold mb-2">Programs</h2>
            <p className="text-muted-foreground">
              Program enrollment and certifications for {builder.name}
            </p>
          </div>
          <Button onClick={handleAddClick} data-testid="button-add-program">
            <Plus className="h-4 w-4 mr-2" />
            Add Program
          </Button>
        </div>

        {programs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Programs</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                No programs found. Add your first program enrollment to get started.
              </p>
              <Button onClick={handleAddClick} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activePrograms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Active Programs ({activePrograms.length})</h3>
                <div className="space-y-3">
                  {activePrograms.map((program) => (
                    <Card key={program.id} className="hover-elevate" data-testid={`card-program-${program.id}`}>
                      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">{program.programName}</h3>
                            {getStatusBadge(program.status)}
                            {program.certificationLevel && (
                              <Badge variant="outline" className="gap-1">
                                <Award className="h-3 w-3" />
                                {program.certificationLevel}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{program.programType}</span>
                            {" • "}
                            Enrolled {format(new Date(program.enrollmentDate), "MMM d, yyyy")}
                            {program.expirationDate && ` - Expires ${format(new Date(program.expirationDate), "MMM d, yyyy")}`}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditClick(program)}
                            data-testid={`button-edit-program-${program.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setProgramToDelete(program.id)}
                            data-testid={`button-delete-program-${program.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      {program.notes && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{program.notes}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {inactivePrograms.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Inactive Programs ({inactivePrograms.length})</h3>
                <div className="space-y-3">
                  {inactivePrograms.map((program) => (
                    <Card key={program.id} className="hover-elevate opacity-75" data-testid={`card-program-${program.id}`}>
                      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">{program.programName}</h3>
                            {getStatusBadge(program.status)}
                            {program.certificationLevel && (
                              <Badge variant="outline" className="gap-1">
                                <Award className="h-3 w-3" />
                                {program.certificationLevel}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{program.programType}</span>
                            {" • "}
                            Enrolled {format(new Date(program.enrollmentDate), "MMM d, yyyy")}
                            {program.expirationDate && ` - Expired ${format(new Date(program.expirationDate), "MMM d, yyyy")}`}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditClick(program)}
                            data-testid={`button-edit-program-${program.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setProgramToDelete(program.id)}
                            data-testid={`button-delete-program-${program.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      {program.notes && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{program.notes}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-program-form">
          <DialogHeader>
            <DialogTitle>
              {programToEdit ? "Edit Program" : "Add Program"}
            </DialogTitle>
            <DialogDescription>
              {programToEdit ? "Update program details" : "Enroll builder in a new program"}
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
                      <Input {...field} placeholder="e.g., Energy Star" data-testid="input-program-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="programType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Certification, Training, Rebate" data-testid="input-program-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  name="certificationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certification Level (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Gold, Platinum" data-testid="input-certification-level" />
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
                  data-testid="button-cancel-program"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-program"
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
        open={!!programToDelete}
        onOpenChange={(open) => !open && setProgramToDelete(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-program-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => programToDelete && deleteMutation.mutate(programToDelete)}
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
