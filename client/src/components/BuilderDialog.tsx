import { useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { insertBuilderSchema } from "@shared/schema";
import type { Builder } from "@shared/schema";

const formSchema = insertBuilderSchema.extend({
  rating: z.coerce.number().min(1).max(5).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface BuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder?: Builder | null;
  onSubmit: (data: FormValues) => void;
  isSubmitting?: boolean;
}

const tradeSpecializations = [
  "General Construction",
  "Energy Compliance",
  "HVAC Systems",
  "Electrical",
  "Plumbing",
  "Framing",
  "Insulation",
  "Roofing",
  "Windows & Doors",
  "Drywall",
  "Painting",
  "Flooring",
];

export function BuilderDialog({
  open,
  onOpenChange,
  builder,
  onSubmit,
  isSubmitting = false,
}: BuilderDialogProps) {
  const isEditMode = !!builder;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      tradeSpecialization: "",
      rating: null,
      notes: "",
    },
  });

  useEffect(() => {
    if (builder) {
      form.reset({
        name: builder.name,
        companyName: builder.companyName,
        email: builder.email || "",
        phone: builder.phone || "",
        address: builder.address || "",
        tradeSpecialization: builder.tradeSpecialization || "",
        rating: builder.rating,
        notes: builder.notes || "",
      });
    } else {
      form.reset({
        name: "",
        companyName: "",
        email: "",
        phone: "",
        address: "",
        tradeSpecialization: "",
        rating: null,
        notes: "",
      });
    }
  }, [builder, form]);

  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-builder">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {isEditMode ? "Edit Builder" : "Add New Builder"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update builder contact information and details."
              : "Add a new builder to your contact database."}
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
                        placeholder="John Doe"
                        {...field}
                        data-testid="input-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="M/I Homes"
                        {...field}
                        data-testid="input-company"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="(614) 555-0101"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-phone"
                      />
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
                    <Input
                      placeholder="123 Main St, Columbus, OH 43215"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tradeSpecialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Specialization</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ""}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-trade">
                          <SelectValue placeholder="Select a trade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tradeSpecializations.map((trade) => (
                          <SelectItem key={trade} value={trade} data-testid={`option-${trade}`}>
                            {trade}
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
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-5)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-rating">
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1" data-testid="option-rating-1">1 Star</SelectItem>
                        <SelectItem value="2" data-testid="option-rating-2">2 Stars</SelectItem>
                        <SelectItem value="3" data-testid="option-rating-3">3 Stars</SelectItem>
                        <SelectItem value="4" data-testid="option-rating-4">4 Stars</SelectItem>
                        <SelectItem value="5" data-testid="option-rating-5">5 Stars</SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Additional notes about this builder..."
                      className="resize-none min-h-24"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-notes"
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
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Saving..." : isEditMode ? "Update Builder" : "Add Builder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
