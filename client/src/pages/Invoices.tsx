import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Download,
  Send,
  Copy,
  Trash,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Edit,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format, addDays, isPast } from "date-fns";
import type { Invoice, InsertInvoice, Payment, InsertPayment } from "@shared/schema";

// Phase 3 - OPTIMIZE: Module-level constant for status badge configuration
// Prevents recreation on every render and centralizes status styling
const STATUS_CONFIG = {
  paid: { className: "bg-green-500", label: "Paid" },
  sent: { className: "bg-blue-500", label: "Sent" },
  overdue: { variant: "destructive" as const, label: "Overdue" },
  cancelled: { variant: "secondary" as const, label: "Cancelled" },
  draft: { variant: "outline" as const, label: "Draft" },
} as const;

function InvoicesContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<InsertPayment>({
    invoiceId: "",
    amount: 0,
    paymentDate: new Date(),
    method: "check",
    reference: "",
    notes: "",
  });

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  // Fetch invoices with proper error handling and retry logic
  const { data: invoices, isLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ["/api/invoices", statusFilter],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams();
      if (queryKey[1] !== "all") {
        params.append("status", queryKey[1] as string);
      }
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    retry: 2, // Retry failed requests twice before showing error
  });

  // Phase 3 - OPTIMIZE: Memoized mark paid mutation with error tracking
  // Prevents dialog from auto-closing on error
  const markPaidMutation = useMutation({
    mutationFn: async (data: { invoiceId: string; payment: InsertPayment }) => {
      // Phase 5 - HARDEN: Validate payment amount before submission
      if (data.payment.amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }
      return apiRequest(`/api/invoices/${data.invoiceId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify(data.payment),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
      setShowPaymentDialog(false);
      setSelectedInvoice(null);
      setPaymentError(null);
    },
    onError: (error: Error) => {
      // Phase 5 - HARDEN: Keep dialog open on error with inline error message
      setPaymentError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized delete mutation with error tracking
  // Prevents dialog from auto-closing on error
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/invoices/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setShowDeleteDialog(false);
      setInvoiceToDelete(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      // Phase 5 - HARDEN: Keep dialog open on error with inline error message
      setDeleteError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized currency formatter to prevent recreation on every render
  // Used for displaying all monetary values consistently
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }, []);

  // Phase 3 - OPTIMIZE: Memoized status badge renderer using centralized config
  // Prevents recreation and uses consistent styling from STATUS_CONFIG
  const getStatusBadge = useCallback((status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
    if ('className' in config) {
      return <Badge className={config.className} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
    }
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  }, []);

  // Phase 3 - OPTIMIZE: Memoized filtered invoices to prevent recomputation on every render
  // Only recalculates when invoices data or search query changes
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    
    if (!searchQuery) return invoices;
    
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice: Invoice) =>
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.total.toString().includes(query)
    );
  }, [invoices, searchQuery]);

  // Phase 3 - OPTIMIZE: Memoized statistics calculation to prevent recomputation
  // Calculates totals and outstanding amounts from invoice data
  // Only recalculates when invoice data changes
  const stats = useMemo(() => {
    if (!invoices) {
      return {
        total: 0,
        outstanding: 0,
        overdue: 0,
      };
    }

    return {
      total: invoices.length,
      // Phase 6 - DOCUMENT: Outstanding = sum of invoices that are sent or overdue (not yet paid)
      outstanding: invoices
        .filter((i: Invoice) => i.status === "sent" || i.status === "overdue")
        .reduce((sum: number, i: Invoice) => sum + parseFloat(i.total), 0),
      // Phase 6 - DOCUMENT: Overdue = sum of invoices past due date that haven't been paid
      overdue: invoices
        .filter((i: Invoice) => i.status === "overdue")
        .reduce((sum: number, i: Invoice) => sum + parseFloat(i.total), 0),
    };
  }, [invoices]);

  // Phase 3 - OPTIMIZE: Memoized event handlers to prevent recreation on every render
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const handleMarkPaid = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDetails({
      invoiceId: invoice.id,
      amount: parseFloat(invoice.total),
      paymentDate: new Date(),
      method: "check",
      reference: "",
      notes: "",
    });
    setPaymentError(null);
    setShowPaymentDialog(true);
  }, []);

  const handleDeleteClick = useCallback((invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteError(null);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!invoiceToDelete) return;
    deleteMutation.mutate(invoiceToDelete.id);
  }, [invoiceToDelete, deleteMutation]);

  // Phase 5 - HARDEN: Payment submission with validation
  const handlePaymentSubmit = useCallback((e?: React.FormEvent) => {
    // Phase 5 - HARDEN: Prevent form submission from closing dialog
    if (e) {
      e.preventDefault();
    }
    
    if (!selectedInvoice) return;

    // Phase 5 - HARDEN: Client-side validation before mutation
    if (paymentDetails.amount <= 0) {
      setPaymentError("Payment amount must be greater than zero");
      return;
    }

    setPaymentError(null);
    markPaidMutation.mutate({
      invoiceId: selectedInvoice.id,
      payment: paymentDetails,
    });
  }, [selectedInvoice, paymentDetails, markPaidMutation]);

  // Phase 5 - HARDEN: Retry handler for invoice query errors
  const handleRetryInvoices = useCallback(() => {
    refetchInvoices();
  }, [refetchInvoices]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoices</h1>
            <p className="text-muted-foreground">Manage customer invoices and payments</p>
          </div>
          <Link href="/invoices/new">
            <Button data-testid="button-new-invoice">
              <Plus className="h-4 w-4 mr-1" />
              New Invoice
            </Button>
          </Link>
        </div>

        {/* Phase 2 - BUILD: Error state with retry for invoices query */}
        {invoicesError ? (
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
        ) : null}

        {/* Stats */}
        {/* Phase 2 - BUILD: Skeleton loaders for stats during loading */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="skeleton-stats">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold" data-testid="text-total-invoices">
                      {stats.total}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-outstanding">
                      {formatCurrency(stats.outstanding)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-overdue">
                      {formatCurrency(stats.overdue)}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
            <CardDescription>View and manage all invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Phase 2 - BUILD: Skeleton loaders for invoice list during loading */}
            {isLoading ? (
              <div className="space-y-3" data-testid="skeleton-invoices">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredInvoices?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: Invoice) => (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-medium" data-testid={`invoice-number-${invoice.id}`}>
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell data-testid={`invoice-customer-${invoice.id}`}>
                          {invoice.builderId ? `Builder ${invoice.builderId}` : "N/A"}
                        </TableCell>
                        <TableCell data-testid={`invoice-date-${invoice.id}`}>
                          {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`invoice-due-${invoice.id}`}>
                          {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-semibold" data-testid={`invoice-amount-${invoice.id}`}>
                          {formatCurrency(parseFloat(invoice.total))}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-actions-${invoice.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <Link href={`/invoices/${invoice.id}`}>
                                <DropdownMenuItem data-testid={`button-edit-${invoice.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  View/Edit
                                </DropdownMenuItem>
                              </Link>
                              {invoice.status !== "paid" && (
                                <DropdownMenuItem 
                                  onClick={() => handleMarkPaid(invoice)}
                                  data-testid={`button-mark-paid-${invoice.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem data-testid={`button-send-${invoice.id}`}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`button-download-${invoice.id}`}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem data-testid={`button-duplicate-${invoice.id}`}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Phase 2 - BUILD: Confirmation dialog for delete instead of immediate deletion */}
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteClick(invoice)}
                                data-testid={`button-delete-${invoice.id}`}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="empty-state">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>No invoices found</p>
                <Link href="/invoices/new">
                  <Button className="mt-4" data-testid="button-create-first">
                    Create your first invoice
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 2 - BUILD: Payment Dialog with error handling and validation */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent data-testid="dialog-payment">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {/* Phase 5 - HARDEN: Inline error message that keeps dialog open */}
          {paymentError && (
            <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-payment">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-400">
                {paymentError}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentDetails.amount}
                onChange={(e) =>
                  setPaymentDetails({ ...paymentDetails, amount: parseFloat(e.target.value) || 0 })
                }
                data-testid="input-payment-amount"
                disabled={markPaidMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="method">Payment Method *</Label>
              <Select
                value={paymentDetails.method}
                onValueChange={(value: any) =>
                  setPaymentDetails({ ...paymentDetails, method: value })
                }
                disabled={markPaidMutation.isPending}
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="ach">ACH Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={paymentDetails.reference || ""}
                onChange={(e) =>
                  setPaymentDetails({ ...paymentDetails, reference: e.target.value })
                }
                placeholder="Check #, transaction ID, etc."
                data-testid="input-payment-reference"
                disabled={markPaidMutation.isPending}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentDetails.notes || ""}
                onChange={(e) =>
                  setPaymentDetails({ ...paymentDetails, notes: e.target.value })
                }
                placeholder="Optional payment notes"
                data-testid="input-payment-notes"
                disabled={markPaidMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            {/* Phase 5 - HARDEN: asChild pattern to prevent auto-close on button click */}
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPaymentDialog(false);
                setPaymentError(null);
              }}
              disabled={markPaidMutation.isPending}
              data-testid="button-cancel-payment"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePaymentSubmit} 
              disabled={markPaidMutation.isPending}
              data-testid="button-submit-payment"
            >
              {/* Phase 3 - OPTIMIZE: Mutation pending state with loading indicator */}
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase 2 - BUILD: Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoiceNumber}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Phase 5 - HARDEN: Inline error message that keeps dialog open */}
          {deleteError && (
            <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-delete">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
                <span>{deleteError}</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  data-testid="button-retry-delete"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMutation.isPending}
              onClick={() => {
                setDeleteError(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Phase 5 - HARDEN: Prevent default to keep dialog open on error
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {/* Phase 3 - OPTIMIZE: Mutation pending state with loading indicator */}
              {deleteMutation.isPending ? (
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

// Phase 2 - BUILD: Wrap entire component with ErrorBoundary for production resilience
export default function Invoices() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-boundary">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Something went wrong</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400">
              <p className="mb-4">Unable to load the invoices page. Please try refreshing the page.</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                data-testid="button-reload"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <InvoicesContent />
    </ErrorBoundary>
  );
}
