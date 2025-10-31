import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  MessageSquare,
  User,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Builder, BuilderContact, InsertBuilderContact } from "@shared/schema";

const ROLE_OPTIONS = [
  { value: "superintendent", label: "Superintendent" },
  { value: "project_manager", label: "Project Manager" },
  { value: "owner", label: "Owner" },
  { value: "estimator", label: "Estimator" },
  { value: "office_manager", label: "Office Manager" },
  { value: "other", label: "Other" },
];

const PREFERRED_CONTACT_OPTIONS = [
  { value: "phone", label: "Phone", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "text", label: "Text", icon: MessageSquare },
];

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum([
    "superintendent",
    "project_manager",
    "owner",
    "estimator",
    "office_manager",
    "other",
  ]),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  preferredContact: z.enum(["phone", "email", "text"]).default("phone"),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface BuilderContactsTabProps {
  builder: Builder;
}

export function BuilderContactsTab({ builder }: BuilderContactsTabProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<BuilderContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery<BuilderContact[]>({
    queryKey: ["/api/builders", builder.id, "contacts"],
    retry: 2,
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      role: "superintendent",
      email: "",
      phone: "",
      mobilePhone: "",
      preferredContact: "phone",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderContact) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder.id}/contacts`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "contacts"],
      });
      setIsAddDialogOpen(false);
      setContactToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
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
      data: Partial<InsertBuilderContact>;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder.id}/contacts/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "contacts"],
      });
      setIsAddDialogOpen(false);
      setContactToEdit(null);
      form.reset();
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/builders/${builder.id}/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "contacts"],
      });
      setContactToDelete(null);
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(
        "PUT",
        `/api/builders/${builder.id}/contacts/${id}/primary`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder.id, "contacts"],
      });
      toast({
        title: "Success",
        description: "Primary contact updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary contact",
        variant: "destructive",
      });
    },
  });

  const handleAddContact = () => {
    setContactToEdit(null);
    form.reset({
      name: "",
      role: "superintendent",
      email: "",
      phone: "",
      mobilePhone: "",
      preferredContact: "phone",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditContact = (contact: BuilderContact) => {
    setContactToEdit(contact);
    form.reset({
      name: contact.name,
      role: contact.role as any,
      email: contact.email || "",
      phone: contact.phone || "",
      mobilePhone: contact.mobilePhone || "",
      preferredContact: (contact.preferredContact as any) || "phone",
      notes: contact.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (data: ContactFormValues) => {
    const submitData = {
      ...data,
      builderId: builder.id,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobilePhone: data.mobilePhone || undefined,
      notes: data.notes || undefined,
    };

    if (contactToEdit) {
      updateMutation.mutate({ id: contactToEdit.id, data: submitData });
    } else {
      createMutation.mutate(submitData as InsertBuilderContact);
    }
  };

  const getRoleLabel = (role: string) => {
    const option = ROLE_OPTIONS.find((opt) => opt.value === role);
    return option?.label || role;
  };

  const getPreferredContactIcon = (preferredContact: string) => {
    const option = PREFERRED_CONTACT_OPTIONS.find(
      (opt) => opt.value === preferredContact
    );
    return option ? option.icon : Phone;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
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
            <h2 className="text-2xl font-bold mb-2">Contacts</h2>
            <p className="text-muted-foreground">
              Manage contact information for {builder.name}
            </p>
          </div>
          <Button onClick={handleAddContact} data-testid="button-add-contact">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Contacts</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                No contacts found. Add your first contact to get started.
              </p>
              <Button onClick={handleAddContact} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => {
              const PreferredIcon = getPreferredContactIcon(
                contact.preferredContact || "phone"
              );
              return (
                <Card
                  key={contact.id}
                  className="hover-elevate"
                  data-testid={`card-contact-${contact.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start gap-3 flex-wrap">
                          <h3
                            className="font-semibold text-lg"
                            data-testid={`text-contact-name-${contact.id}`}
                          >
                            {contact.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            data-testid={`badge-role-${contact.role}`}
                          >
                            {getRoleLabel(contact.role)}
                          </Badge>
                          {contact.isPrimary && (
                            <Badge
                              variant="default"
                              className="gap-1"
                              data-testid={`badge-primary-${contact.id}`}
                            >
                              <Star className="h-3 w-3 fill-current" />
                              Primary
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          {contact.email && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              data-testid={`text-contact-email-${contact.id}`}
                            >
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-primary hover:underline"
                              >
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.phone && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              data-testid={`text-contact-phone-${contact.id}`}
                            >
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-primary hover:underline"
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )}
                          {contact.mobilePhone && (
                            <div
                              className="flex items-center gap-2 text-sm"
                              data-testid={`text-contact-mobile-${contact.id}`}
                            >
                              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`tel:${contact.mobilePhone}`}
                                className="text-primary hover:underline"
                              >
                                {contact.mobilePhone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <PreferredIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">
                              Prefers{" "}
                              {PREFERRED_CONTACT_OPTIONS.find(
                                (opt) =>
                                  opt.value === contact.preferredContact
                              )?.label || "Phone"}
                            </span>
                          </div>
                        </div>

                        {contact.notes && (
                          <>
                            <Separator />
                            <p
                              className="text-sm text-muted-foreground whitespace-pre-wrap"
                              data-testid={`text-contact-notes-${contact.id}`}
                            >
                              {contact.notes}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {!contact.isPrimary && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setPrimaryMutation.mutate(contact.id)}
                            disabled={setPrimaryMutation.isPending}
                            data-testid={`button-set-primary-${contact.id}`}
                          >
                            {setPrimaryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditContact(contact)}
                          data-testid={`button-edit-contact-${contact.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setContactToDelete(contact.id)}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-contact-form"
        >
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">
              {contactToEdit ? "Edit Contact" : "Add New Contact"}
            </DialogTitle>
            <DialogDescription>
              {contactToEdit
                ? "Update contact information"
                : "Add a new contact for this builder"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., John Smith"
                          {...field}
                          data-testid="input-contact-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLE_OPTIONS.map((option) => (
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="e.g., john.smith@example.com"
                        {...field}
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., (555) 123-4567"
                          {...field}
                          data-testid="input-contact-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobilePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., (555) 987-6543"
                          {...field}
                          data-testid="input-contact-mobile"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="preferredContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-preferred-contact">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PREFERRED_CONTACT_OPTIONS.map((option) => (
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this contact..."
                        rows={3}
                        {...field}
                        data-testid="textarea-contact-notes"
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
                  data-testid="button-cancel-contact"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-contact"
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
        open={!!contactToDelete}
        onOpenChange={(open) => !open && setContactToDelete(null)}
      >
        <AlertDialogContent data-testid="dialog-delete-contact-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contactToDelete && deleteMutation.mutate(contactToDelete)}
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
