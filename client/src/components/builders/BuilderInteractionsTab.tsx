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
  MessageSquare,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Users,
  Calendar as CalIcon,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Builder, BuilderInteraction, InsertBuilderInteraction } from "@shared/schema";

const INTERACTION_TYPES = [
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "text", label: "Text Message", icon: MessageSquare },
  { value: "site_visit", label: "Site Visit", icon: MapPin },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const OUTCOME_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "no_answer", label: "No Answer" },
];

const interactionFormSchema = z.object({
  interactionType: z.enum(["call", "email", "meeting", "text", "site_visit", "other"]),
  interactionDate: z.date(),
  contactName: z.string().optional(),
  userName: z.string().optional(),
  notes: z.string().min(1, "Notes are required"),
  outcome: z.string().optional(),
  followUpRequired: z.boolean(),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

interface BuilderInteractionsTabProps {
  builder: Builder;
}

export function BuilderInteractionsTab({ builder }: BuilderInteractionsTabProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [interactionToEdit, setInteractionToEdit] = useState<BuilderInteraction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<string | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: interactions = [], isLoading } = useQuery<BuilderInteraction[]>({
    queryKey: ["/api/builders", builder.id, "interactions"],
    retry: 2,
  });

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      interactionType: "call",
      interactionDate: new Date(),
      contactName: "",
      userName: "",
      notes: "",
      outcome: "",
      followUpRequired: false,
    },
  });  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderInteraction) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder.id}/interactions`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "interactions"],
      });
      setIsAddDialogOpen(false);
      setInteractionToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Interaction logged successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to log interaction",
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
      data: Partial<InsertBuilderInteraction>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder.id}/interactions/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "interactions"],
      });
      setIsAddDialogOpen(false);
      setInteractionToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Interaction updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update interaction",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builder.id}/interactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "interactions"],
      });
      setInteractionToDelete(null);
      toast({
        title: "Success",
        description: "Interaction deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete interaction",
        variant: "destructive",
      });
    },
  });

  const handleAddClick = () => {
    setInteractionToEdit(null);
    form.reset({
      interactionDate: new Date(),
      interactionType: "call",
      contactName: "",
      userName: "",
      notes: "",
      outcome: "neutral",
      followUpRequired: false,
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (interaction: BuilderInteraction) => {
    setInteractionToEdit(interaction);
    form.reset({
      interactionDate: new Date(interaction.interactionDate),
      interactionType: interaction.interactionType as any,
      contactName: interaction.contactName || "",
      userName: interaction.userName || "",
      notes: interaction.notes || "",
      outcome: (interaction.outcome as any) || "neutral",
      followUpRequired: interaction.followUpRequired || false,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: InteractionFormValues) => {
    const interactionData: InsertBuilderInteraction = {
      builderId: builder.id,
      interactionDate: data.interactionDate,
      interactionType: data.interactionType,
      contactName: data.contactName || null,
      userName: data.userName || null,
      notes: data.notes,
      outcome: data.outcome || null,
      followUpRequired: data.followUpRequired,
    };

    if (interactionToEdit) {
      await updateMutation.mutateAsync({ id: interactionToEdit.id, data: interactionData });
    } else {
      await createMutation.mutateAsync(interactionData);
    }
  };

  const getInteractionTypeLabel = (type: string) => {
    const option = INTERACTION_TYPES.find(t => t.value === type);
    return option?.label || type;
  };

  const getInteractionTypeIcon = (type: string) => {
    const option = INTERACTION_TYPES.find(t => t.value === type);
    return option ? option.icon : MessageSquare;
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;

    const outcomeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      positive: { label: "Positive", variant: "default" },
      neutral: { label: "Neutral", variant: "secondary" },
      negative: { label: "Negative", variant: "destructive" },
      no_answer: { label: "No Answer", variant: "outline" },
    };

    const info = outcomeMap[outcome];
    return info ? (
      <Badge variant={info.variant} data-testid={`badge-outcome-${outcome}`}>
        {info.label}
      </Badge>
    ) : null;
  };

  // Filter and sort interactions
  const filteredInteractions = interactions
    .filter(i => filterType === "all" || i.interactionType === filterType)
    .sort((a, b) => new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime());

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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold mb-2">Interactions</h2>
            <p className="text-muted-foreground">
              Communication history and logs for {builder.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40" data-testid="select-filter-type">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {INTERACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddClick} data-testid="button-add-interaction">
              <Plus className="h-4 w-4 mr-2" />
              Log Interaction
            </Button>
          </div>
        </div>

        {filteredInteractions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filterType === "all" ? "No Interactions" : "No Matching Interactions"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                {filterType === "all"
                  ? "No interactions logged yet. Add your first interaction to get started."
                  : `No ${getInteractionTypeLabel(filterType).toLowerCase()} interactions found.`}
              </p>
              <Button onClick={handleAddClick} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Interaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInteractions.map((interaction) => {
              const Icon = getInteractionTypeIcon(interaction.interactionType);
              return (
                <Card
                  key={interaction.id}
                  className={cn(
                    "hover-elevate",
                    interaction.followUpRequired && "border-l-4 border-l-destructive"
                  )}
                  data-testid={`card-interaction-${interaction.id}`}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <h3 className="font-semibold text-lg">
                          {getInteractionTypeLabel(interaction.interactionType)}
                        </h3>
                        {getOutcomeBadge(interaction.outcome)}
                        {interaction.followUpRequired && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Follow-up Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <CalIcon className="h-4 w-4" />
                        <span>{format(new Date(interaction.interactionDate), "MMM d, yyyy")}</span>
                        {interaction.contactName && (
                          <>
                            <span>•</span>
                            <User className="h-4 w-4" />
                            <span>{interaction.contactName}</span>
                          </>
                        )}
                        {interaction.userName && (
                          <>
                            <span>•</span>
                            <span className="text-xs">by {interaction.userName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditClick(interaction)}
                        data-testid={`button-edit-interaction-${interaction.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setInteractionToDelete(interaction.id)}
                        data-testid={`button-delete-interaction-${interaction.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  {interaction.notes && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {interaction.notes}
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-interaction-form">
          <DialogHeader>
            <DialogTitle>
              {interactionToEdit ? "Edit Interaction" : "Log Interaction"}
            </DialogTitle>
            <DialogDescription>
              {interactionToEdit ? "Update interaction details" : "Record a new interaction"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-interaction-date"
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
                              setIsDateOpen(false);
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
                  name="interactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-interaction-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTERACTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Who did you speak with?" data-testid="input-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Who logged this?" data-testid="input-user-name" />
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
                    <FormLabel>Notes *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="What was discussed? Any important details or outcomes..."
                        rows={5}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-outcome">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OUTCOME_OPTIONS.map((option) => (
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
                name="followUpRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-follow-up"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Follow-up Required
                      </FormLabel>
                      <FormDescription>
                        Mark this interaction as requiring follow-up action
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-interaction"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-interaction"
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
        open={!!interactionToDelete}
        onOpenChange={(open) => !open && setInteractionToDelete(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-interaction-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => interactionToDelete && deleteMutation.mutate(interactionToDelete)}
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
