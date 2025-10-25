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
  Phone,
  Mail,
  Users,
  MessageSquare,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Builder, BuilderInteraction, BuilderContact, InsertBuilderInteraction } from "@shared/schema";

const INTERACTION_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "text", label: "Text", icon: MessageSquare },
  { value: "site_visit", label: "Site Visit", icon: MapPin },
  { value: "other", label: "Other", icon: FileText },
];

const interactionFormSchema = z.object({
  interactionType: z.enum(["call", "email", "meeting", "text", "site_visit", "other"]),
  interactionDate: z.date({ required_error: "Interaction date is required" }),
  contactId: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
  outcome: z.string().optional(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.date().optional().nullable(),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

interface BuilderInteractionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
}

export function BuilderInteractionsDialog({
  open,
  onOpenChange,
  builder,
}: BuilderInteractionsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [interactionToEdit, setInteractionToEdit] = useState<BuilderInteraction | null>(null);
  const [interactionToDelete, setInteractionToDelete] = useState<string | null>(null);
  const [isInteractionDateOpen, setIsInteractionDateOpen] = useState(false);
  const [isFollowUpDateOpen, setIsFollowUpDateOpen] = useState(false);

  const { data: interactions = [], isLoading } = useQuery<BuilderInteraction[]>({
    queryKey: ["/api/builders", builder?.id, "interactions"],
    enabled: open && !!builder,
  });

  const { data: contacts = [] } = useQuery<BuilderContact[]>({
    queryKey: ["/api/builders", builder?.id, "contacts"],
    enabled: open && !!builder,
  });

  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      interactionType: "call",
      interactionDate: new Date(),
      contactId: null,
      subject: "",
      description: "",
      outcome: "",
      followUpRequired: false,
      followUpDate: null,
    },
  });

  const followUpRequired = form.watch("followUpRequired");

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderInteraction) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder!.id}/interactions`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "interactions"],
      });
      setIsAddDialogOpen(false);
      setInteractionToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Interaction added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add interaction",
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
        `/api/builders/${builder!.id}/interactions/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "interactions"],
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
      await apiRequest("DELETE", `/api/builders/${builder!.id}/interactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "interactions"],
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
      interactionType: "call",
      interactionDate: new Date(),
      contactId: null,
      subject: "",
      description: "",
      outcome: "",
      followUpRequired: false,
      followUpDate: null,
    });
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (interaction: BuilderInteraction) => {
    setInteractionToEdit(interaction);
    form.reset({
      interactionType: interaction.interactionType as any,
      interactionDate: new Date(interaction.interactionDate),
      contactId: interaction.contactId || null,
      subject: interaction.subject,
      description: interaction.description,
      outcome: interaction.outcome || "",
      followUpRequired: interaction.followUpRequired,
      followUpDate: interaction.followUpDate ? new Date(interaction.followUpDate) : null,
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async (data: InteractionFormValues) => {
    const interactionData: InsertBuilderInteraction = {
      builderId: builder!.id,
      interactionType: data.interactionType,
      interactionDate: data.interactionDate,
      contactId: data.contactId || null,
      subject: data.subject,
      description: data.description,
      outcome: data.outcome || null,
      followUpRequired: data.followUpRequired,
      followUpDate: data.followUpDate || null,
    };

    if (interactionToEdit) {
      await updateMutation.mutateAsync({ id: interactionToEdit.id, data: interactionData });
    } else {
      await createMutation.mutateAsync(interactionData);
    }
  };

  const getInteractionIcon = (type: string) => {
    const typeConfig = INTERACTION_TYPES.find(t => t.value === type);
    const Icon = typeConfig?.icon || FileText;
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  const getTypeBadge = (type: string) => {
    const typeOption = INTERACTION_TYPES.find(t => t.value === type);
    return (
      <Badge variant="outline" data-testid={`badge-type-${type}`}>
        {typeOption?.label || type}
      </Badge>
    );
  };

  const getContactName = (contactId: string | null) => {
    if (!contactId) return null;
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : null;
  };

  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime()
  );

  if (!builder) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-builder-interactions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Interactions - {builder.name}
            </DialogTitle>
            <DialogDescription>
              Communication history and timeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {interactions.length} {interactions.length === 1 ? "interaction" : "interactions"}
              </p>
              <Button
                onClick={handleAddClick}
                size="sm"
                data-testid="button-add-interaction"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Interaction
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
            ) : sortedInteractions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No interactions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start tracking your communications with this builder
                  </p>
                  <Button onClick={handleAddClick} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interaction
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sortedInteractions.map((interaction) => (
                  <Card key={interaction.id} className="hover-elevate">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4 space-y-0">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-1">
                          {getInteractionIcon(interaction.interactionType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{interaction.subject}</h3>
                            {getTypeBadge(interaction.interactionType)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(interaction.interactionDate), "PPP 'at' p")}
                            {interaction.contactId && getContactName(interaction.contactId) && (
                              <> • with {getContactName(interaction.contactId)}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(interaction)}
                          data-testid={`button-edit-interaction-${interaction.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setInteractionToDelete(interaction.id)}
                          data-testid={`button-delete-interaction-${interaction.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        {interaction.description}
                      </div>
                      {interaction.outcome && (
                        <div className="text-sm pt-2 border-t">
                          <span className="text-muted-foreground">Outcome:</span>{" "}
                          {interaction.outcome}
                        </div>
                      )}
                      {interaction.followUpRequired && (
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant="outline">
                            Follow-up Required
                            {interaction.followUpDate && ` • ${format(new Date(interaction.followUpDate), "MMM d, yyyy")}`}
                          </Badge>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-interaction-form">
          <DialogHeader>
            <DialogTitle>
              {interactionToEdit ? "Edit Interaction" : "Add Interaction"}
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
                  name="interactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interaction Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-interaction-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INTERACTION_TYPES.map((option) => (
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
                  name="interactionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <Popover open={isInteractionDateOpen} onOpenChange={setIsInteractionDateOpen}>
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
                              setIsInteractionDateOpen(false);
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
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-contact">
                          <SelectValue placeholder="Select a contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No specific contact</SelectItem>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} - {contact.role}
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Discussion about upcoming project" data-testid="input-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Details of the interaction..."
                        rows={4}
                        data-testid="textarea-description"
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
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Result or next steps..."
                        rows={2}
                        data-testid="textarea-outcome"
                      />
                    </FormControl>
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
                        Mark if this interaction requires a follow-up
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {followUpRequired && (
                <FormField
                  control={form.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <Popover open={isFollowUpDateOpen} onOpenChange={setIsFollowUpDateOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-follow-up-date"
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
                              setIsFollowUpDateOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                  {interactionToEdit ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!interactionToDelete} onOpenChange={() => setInteractionToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => interactionToDelete && deleteMutation.mutate(interactionToDelete)}
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
