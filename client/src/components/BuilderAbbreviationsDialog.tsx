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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Edit,
  Trash2,
  Star,
  Tag,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BuilderAbbreviation, InsertBuilderAbbreviation } from "@shared/schema";

const abbreviationFormSchema = z.object({
  abbreviation: z.string().min(1, "Abbreviation is required").max(20, "Abbreviation must be 20 characters or less"),
  isPrimary: z.boolean().default(false),
});

type AbbreviationFormValues = z.infer<typeof abbreviationFormSchema>;

interface BuilderAbbreviationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderId: string;
}

export function BuilderAbbreviationsDialog({
  open,
  onOpenChange,
  builderId,
}: BuilderAbbreviationsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [abbreviationToEdit, setAbbreviationToEdit] = useState<BuilderAbbreviation | null>(null);
  const [abbreviationToDelete, setAbbreviationToDelete] = useState<string | null>(null);

  const { data: abbreviations = [], isLoading } = useQuery<BuilderAbbreviation[]>({
    queryKey: ["/api/builders", builderId, "abbreviations"],
    enabled: open && !!builderId,
  });

  const form = useForm<AbbreviationFormValues>({
    resolver: zodResolver(abbreviationFormSchema),
    defaultValues: {
      abbreviation: "",
      isPrimary: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderAbbreviation) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builderId}/abbreviations`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builderId, "abbreviations"],
      });
      setIsAddDialogOpen(false);
      setAbbreviationToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Abbreviation added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add abbreviation",
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
      data: Partial<InsertBuilderAbbreviation>;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/builders/${builderId}/abbreviations/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builderId, "abbreviations"],
      });
      setIsAddDialogOpen(false);
      setAbbreviationToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Abbreviation updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update abbreviation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builderId}/abbreviations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builderId, "abbreviations"],
      });
      setAbbreviationToDelete(null);
      toast({
        title: "Success",
        description: "Abbreviation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete abbreviation",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builderId}/abbreviations/${id}/set-primary`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builderId, "abbreviations"],
      });
      toast({
        title: "Success",
        description: "Primary abbreviation updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary abbreviation",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setAbbreviationToEdit(null);
    form.reset({
      abbreviation: "",
      isPrimary: false,
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (abbreviation: BuilderAbbreviation) => {
    setAbbreviationToEdit(abbreviation);
    form.reset({
      abbreviation: abbreviation.abbreviation,
      isPrimary: abbreviation.isPrimary || false,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: AbbreviationFormValues) => {
    const abbreviationData: InsertBuilderAbbreviation = {
      builderId,
      abbreviation: data.abbreviation,
      isPrimary: data.isPrimary,
    };

    if (abbreviationToEdit) {
      await updateMutation.mutateAsync({ id: abbreviationToEdit.id, data: abbreviationData });
    } else {
      await createMutation.mutateAsync(abbreviationData);
    }
  };

  const handleSetPrimary = (abbreviationId: string) => {
    setPrimaryMutation.mutate(abbreviationId);
  };

  const confirmDelete = () => {
    if (abbreviationToDelete) {
      deleteMutation.mutate(abbreviationToDelete);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-builder-abbreviations"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Builder Abbreviations
            </DialogTitle>
            <DialogDescription>
              Manage calendar event abbreviations for this builder
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                ))}
              </div>
            ) : abbreviations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No abbreviations yet</p>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Add abbreviations to help identify this builder in calendar events
                  </p>
                  <Button onClick={handleAddClick} size="sm" data-testid="button-add-first-abbreviation">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Abbreviation
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abbreviation</TableHead>
                      <TableHead>Primary Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abbreviations.map((abbreviation) => (
                      <TableRow
                        key={abbreviation.id}
                        className="hover-elevate"
                        data-testid={`row-abbreviation-${abbreviation.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-abbreviation-${abbreviation.id}`}>
                          {abbreviation.abbreviation}
                        </TableCell>
                        <TableCell>
                          {abbreviation.isPrimary ? (
                            <Badge variant="default" className="gap-1" data-testid={`badge-primary-${abbreviation.id}`}>
                              <Star className="h-3 w-3" />
                              Primary
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {!abbreviation.isPrimary && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetPrimary(abbreviation.id)}
                                disabled={setPrimaryMutation.isPending}
                                data-testid={`button-set-primary-${abbreviation.id}`}
                              >
                                {setPrimaryMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Star className="h-4 w-4 mr-2" />
                                )}
                                Set Primary
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(abbreviation)}
                              data-testid={`button-edit-abbreviation-${abbreviation.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setAbbreviationToDelete(abbreviation.id)}
                              data-testid={`button-delete-abbreviation-${abbreviation.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddClick}
                    size="sm"
                    data-testid="button-add-abbreviation"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Abbreviation
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-abbreviation-form">
          <DialogHeader>
            <DialogTitle>
              {abbreviationToEdit ? "Edit Abbreviation" : "Add Abbreviation"}
            </DialogTitle>
            <DialogDescription>
              {abbreviationToEdit
                ? "Update abbreviation details"
                : "Create a new abbreviation for calendar event parsing"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="abbreviation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abbreviation</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="ABC"
                        maxLength={20}
                        data-testid="input-abbreviation"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Set as primary</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        The primary abbreviation will be used as the default for this builder
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-abbreviation"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-abbreviation"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!abbreviationToDelete} onOpenChange={(open) => !open && setAbbreviationToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-abbreviation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Abbreviation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this abbreviation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-abbreviation">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-abbreviation"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
