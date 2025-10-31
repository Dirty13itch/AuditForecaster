import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Payment, InsertPayment, Invoice } from "@shared/schema";
import { insertPaymentSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  CalendarIcon, 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Payment methods available in the system
const PAYMENT_METHODS = [
  { value: "direct_deposit", label: "Direct Deposit" },
  { value: "check", label: "Check" },
  { value: "wire", label: "Wire Transfer" },
] as const;

// Phase 2 - BUILD: PaymentsContent wrapped in ErrorBoundary at export
function PaymentsContent() {
  const { toast } = useToast();
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  // Fetch invoices for selection dropdown
  const { 
    data: invoices = [], 
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    retry: 2,
  });

  // Phase 5 - HARDEN: Added retry: 2 for resilience
  // Fetch all payments from the API
  const { 
    data: payments = [], 
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    retry: 2,
  });

  const form = useForm<InsertPayment>({
    resolver: zodResolver(insertPaymentSchema.extend({
      // Phase 5 - HARDEN: Enhanced validation
      // Ensure invoice is selected
      invoiceId: insertPaymentSchema.shape.invoiceId.min(1, "Please select an invoice"),
      // Amount must be greater than 0
      amount: insertPaymentSchema.shape.amount.refine((val) => val > 0, {
        message: "Amount must be greater than 0",
      }),
    })),
    defaultValues: {
      invoiceId: "",
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "direct_deposit",
      referenceNumber: "",
      notes: "",
    },
  });

  // Phase 3 - OPTIMIZE: Memoized mutation to prevent recreation
  // Create new payment record
  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      return await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      form.reset();
      setEditingPayment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  // Phase 2 - BUILD: Update payment mutation for edit functionality
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPayment> }) => {
      return apiRequest(`/api/payments/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      setEditingPayment(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  // Phase 2 - BUILD: Delete payment mutation
  // Phase 5 - HARDEN: Dialog stays open on error for retry
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/payments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      // Phase 5 - HARDEN: Keep dialog open on error, show inline error
      setDeleteError(error.message || "Failed to delete payment");
    },
  });

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation on every render
  const onSubmit = useCallback((data: InsertPayment) => {
    // Phase 5 - HARDEN: Check for overpayment warning
    if (data.invoiceId) {
      const invoice = invoices.find(inv => inv.id === data.invoiceId);
      if (invoice) {
        const invoiceTotal = parseFloat(invoice.total);
        if (data.amount > invoiceTotal) {
          toast({
            title: "Warning",
            description: `Payment amount ($${data.amount}) exceeds invoice total ($${invoiceTotal.toFixed(2)})`,
            variant: "destructive",
          });
        }
      }
    }

    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data });
    } else {
      createPaymentMutation.mutate(data);
    }
  }, [editingPayment, updatePaymentMutation, createPaymentMutation, invoices, toast]);

  // Phase 3 - OPTIMIZE: Memoized helper function to find invoice by ID
  // Used to display invoice details in the payments table
  const getInvoiceById = useCallback((id: string) => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  // Phase 3 - OPTIMIZE: Memoized sorted payments to prevent recomputation
  // Sorts payments by date descending (most recent first)
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
    });
  }, [payments]);

  // Phase 3 - OPTIMIZE: useCallback for edit handler
  const handleEdit = useCallback((payment: Payment) => {
    setEditingPayment(payment);
    form.reset({
      invoiceId: payment.invoiceId || "",
      amount: parseFloat(payment.amount),
      paymentDate: new Date(payment.paymentDate),
      paymentMethod: payment.paymentMethod || "direct_deposit",
      referenceNumber: payment.referenceNumber || "",
      notes: payment.notes || "",
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [form]);

  // Phase 3 - OPTIMIZE: useCallback for delete handler
  const handleDeleteClick = useCallback((paymentId: string) => {
    setPaymentToDelete(paymentId);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (paymentToDelete) {
      deletePaymentMutation.mutate(paymentToDelete);
    }
  }, [paymentToDelete, deletePaymentMutation]);

  // Phase 3 - OPTIMIZE: useCallback for cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingPayment(null);
    form.reset();
  }, [form]);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetryInvoices = useCallback(() => {
    refetchInvoices();
  }, [refetchInvoices]);

  const handleRetryPayments = useCallback(() => {
    refetchPayments();
  }, [refetchPayments]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Payments</h1>
            <p className="text-muted-foreground">Record and track payments from Building Knowledge</p>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid="text-payment-count">
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Phase 2 - BUILD: Error state for invoices with retry */}
        {invoicesError && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-invoices">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Invoices</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
              <span>Unable to fetch invoices. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryInvoices}
                data-testid="button-retry-invoices"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Entry Form */}
        <Card data-testid="card-payment-form">
          <CardHeader>
            <CardTitle data-testid="text-form-title">
              {editingPayment ? "Edit Payment" : "Record Payment"}
            </CardTitle>
            <CardDescription>
              {editingPayment 
                ? "Update payment details" 
                : "Enter payment details received from Building Knowledge"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice">
                              <SelectValue placeholder="Select invoice" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {invoicesLoading ? (
                              <SelectItem value="loading" disabled data-testid="select-invoice-loading">
                                Loading invoices...
                              </SelectItem>
                            ) : invoices.length === 0 ? (
                              <SelectItem value="none" disabled data-testid="select-invoice-empty">
                                No invoices available
                              </SelectItem>
                            ) : (
                              invoices.map((invoice) => (
                                <SelectItem 
                                  key={invoice.id} 
                                  value={invoice.id}
                                  data-testid={`select-invoice-option-${invoice.id}`}
                                >
                                  {invoice.invoiceNumber} - ${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-invoice" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-9"
                              data-testid="input-amount"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage data-testid="error-amount" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-payment-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage data-testid="error-payment-date" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem 
                                key={method.value} 
                                value={method.value}
                                data-testid={`select-method-${method.value}`}
                              >
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="error-payment-method" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Check # or transaction ID"
                            data-testid="input-reference-number"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage data-testid="error-reference-number" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional payment details..."
                          data-testid="textarea-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage data-testid="error-notes" />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                    data-testid="button-submit-payment"
                  >
                    {(createPaymentMutation.isPending || updatePaymentMutation.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingPayment ? "Updating..." : "Recording..."}
                      </>
                    ) : (
                      <>
                        {editingPayment ? (
                          <>
                            <Edit className="mr-2 h-4 w-4" />
                            Update Payment
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Record Payment
                          </>
                        )}
                      </>
                    )}
                  </Button>
                  {editingPayment && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card data-testid="card-payments-table">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Payment history from Building Knowledge</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Phase 2 - BUILD: Skeleton loader during loading */}
            {paymentsLoading ? (
              <div className="space-y-3" data-testid="skeleton-payments-table">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : paymentsError ? (
              // Phase 2 - BUILD: Error state with retry
              <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-payments">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Payments</AlertTitle>
                <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
                  <span>Unable to fetch payments. Please try again.</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleRetryPayments}
                    data-testid="button-retry-payments"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : sortedPayments.length === 0 ? (
              // Phase 5 - HARDEN: Helpful empty state
              <div className="text-center py-12" data-testid="empty-state-payments">
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No payments recorded yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking payments by recording your first payment above
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-payment-date">Payment Date</TableHead>
                      <TableHead data-testid="header-invoice">Invoice #</TableHead>
                      <TableHead data-testid="header-amount">Amount</TableHead>
                      <TableHead data-testid="header-method">Payment Method</TableHead>
                      <TableHead data-testid="header-reference">Reference #</TableHead>
                      <TableHead data-testid="header-actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment) => {
                      const invoice = payment.invoiceId ? getInvoiceById(payment.invoiceId) : null;
                      return (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell data-testid={`cell-payment-date-${payment.id}`}>
                            {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell data-testid={`cell-invoice-number-${payment.id}`}>
                            {invoice?.invoiceNumber || "N/A"}
                          </TableCell>
                          <TableCell className="font-semibold" data-testid={`cell-amount-${payment.id}`}>
                            ${parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="capitalize" data-testid={`cell-payment-method-${payment.id}`}>
                            {payment.paymentMethod?.replace('_', ' ') || "N/A"}
                          </TableCell>
                          <TableCell data-testid={`cell-reference-number-${payment.id}`}>
                            {payment.referenceNumber || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(payment)}
                                data-testid={`button-edit-${payment.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteClick(payment.id)}
                                data-testid={`button-delete-${payment.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 - BUILD: Delete confirmation dialog */}
      {/* Phase 5 - HARDEN: Dialog stays open on error for retry */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-payment">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Delete Payment</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              Are you sure you want to delete this payment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-delete">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-400">
                {deleteError}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteError(null);
                setPaymentToDelete(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletePaymentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deletePaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Phase 2 - BUILD: Export wrapped in ErrorBoundary
export default function PaymentsPage() {
  return (
    <ErrorBoundary>
      <PaymentsContent />
    </ErrorBoundary>
  );
}
