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

interface BuilderContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
}

export function BuilderContactsDialog({
  open,
  onOpenChange,
  builder,
}: BuilderContactsDialogProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<BuilderContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  const { data: contacts = [], isLoading } = useQuery<BuilderContact[]>({
    queryKey: ["/api/builders", builder?.id, "contacts"],
    enabled: open && !!builder,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilderContact) => {
      const res = await apiRequest(
        "POST",
        `/api/builders/${builder!.id}/contacts`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "contacts"],
      });
      setIsAddDialogOpen(false);
      setContactToEdit(null);
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
        `/api/builders/${builder!.id}/contacts/${id}`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "contacts"],
      });
      setIsAddDialogOpen(false);
      setContactToEdit(null);
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
      await apiRequest("DELETE", `/api/builders/${builder!.id}/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "contacts"],
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
        `/api/builders/${builder!.id}/contacts/${id}/primary`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/builders", builder?.id, "contacts"],
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
    setIsAddDialogOpen(true);
  };

  const handleEditContact = (contact: BuilderContact) => {
    setContactToEdit(contact);
    setIsAddDialogOpen(true);
  };

  const handleDeleteContact = (contactId: string) => {
    setContactToDelete(contactId);
  };

  const handleSetPrimary = (contactId: string) => {
    setPrimaryMutation.mutate(contactId);
  };

  const confirmDelete = () => {
    if (contactToDelete) {
      deleteMutation.mutate(contactToDelete);
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

  if (!builder) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          data-testid="dialog-builder-contacts"
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl">Contacts</DialogTitle>
                <DialogDescription>
                  Manage contacts for {builder.name}
                </DialogDescription>
              </div>
              <Button
                onClick={handleAddContact}
                size="sm"
                data-testid="button-add-contact"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No contacts found. Add your first contact to get started.
                  </p>
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
                                onClick={() => handleSetPrimary(contact.id)}
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
                              onClick={() => handleDeleteContact(contact.id)}
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

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-contacts"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContactFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        contact={contactToEdit}
        builderId={builder.id}
        onSubmit={(data) => {
          if (contactToEdit) {
            updateMutation.mutate({ id: contactToEdit.id, data });
          } else {
            createMutation.mutate({ ...data, builderId: builder.id });
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

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
              onClick={confirmDelete}
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

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: BuilderContact | null;
  builderId: string;
  onSubmit: (data: ContactFormValues) => void;
  isPending: boolean;
}

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  builderId,
  onSubmit,
  isPending,
}: ContactFormDialogProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact
      ? {
          name: contact.name,
          role: contact.role as any,
          email: contact.email || "",
          phone: contact.phone || "",
          mobilePhone: contact.mobilePhone || "",
          preferredContact: (contact.preferredContact as any) || "phone",
          notes: contact.notes || "",
        }
      : {
          name: "",
          role: "superintendent",
          email: "",
          phone: "",
          mobilePhone: "",
          preferredContact: "phone",
          notes: "",
        },
  });

  const handleSubmit = (data: ContactFormValues) => {
    const submitData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobilePhone: data.mobilePhone || undefined,
      notes: data.notes || undefined,
    };
    onSubmit(submitData as ContactFormValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="dialog-contact-form"
      >
        <DialogHeader>
          <DialogTitle data-testid="text-form-title">
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
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
                        <SelectValue placeholder="Select preferred method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PREFERRED_CONTACT_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
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
                      data-testid="input-contact-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-form"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-contact"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {contact ? "Updating..." : "Adding..."}
                  </>
                ) : contact ? (
                  "Update Contact"
                ) : (
                  "Add Contact"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
