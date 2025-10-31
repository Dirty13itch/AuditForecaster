import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type InsertExpense, type Expense } from "@shared/schema";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Trash,
  Edit,
  FileText,
  DollarSign,
  Tag,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ReceiptUpload, type OcrResult } from "@/components/expenses/ReceiptUpload";

// Expense category definitions with descriptions for tax purposes
// These categories align with common business expense classifications for tax reporting
const EXPENSE_CATEGORIES = [
  { value: "fuel", label: "Fuel", description: "Vehicle fuel costs" },
  { value: "equipment", label: "Equipment", description: "Equipment purchases and rentals" },
  { value: "supplies", label: "Supplies", description: "General business supplies" },
  { value: "meals", label: "Meals", description: "Business meals and entertainment (50% deductible)" },
  { value: "lodging", label: "Lodging", description: "Hotel and accommodation expenses" },
  { value: "office", label: "Office", description: "Office supplies and expenses" },
  { value: "insurance", label: "Insurance", description: "Business insurance premiums" },
  { value: "vehicle", label: "Vehicle Maintenance", description: "Vehicle repairs and maintenance" },
  { value: "tools", label: "Tools", description: "Tools and equipment" },
  { value: "software", label: "Software", description: "Software subscriptions and licenses" },
  { value: "advertising", label: "Advertising", description: "Marketing and advertising costs" },
  { value: "professional", label: "Professional Services", description: "Consulting, legal, accounting fees" },
  { value: "other", label: "Other", description: "Other business expenses" },
] as const;

// Default form values (reused for creating new expenses and resetting)
const DEFAULT_EXPENSE_FORM_VALUES: Partial<InsertExpense> = {
  category: "supplies",
  amount: 0,
  date: new Date(),
  description: "",
  jobId: undefined,
  receiptUrl: "",
  isDeductible: true,
  ocrText: undefined,
  ocrConfidence: undefined,
  ocrAmount: undefined,
  ocrVendor: undefined,
  ocrDate: undefined,
  ocrMetadata: undefined,
};

// Skeleton loader for stats cards during initial page load
function StatsCardSkeleton() {
  return (
    <Card data-testid="skeleton-stats-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton loader for expense table during data fetch
function ExpenseTableSkeleton() {
  return (
    <div className="space-y-3" data-testid="skeleton-expense-table">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

function ExpensesContent() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: DEFAULT_EXPENSE_FORM_VALUES,
  });

  // Handle OCR completion - auto-populate form fields with extracted receipt data
  // OCR processing extracts amount, vendor, and date from receipt photos using Tesseract.js
  const handleOcrComplete = useCallback((ocrData: OcrResult) => {
    // Auto-populate amount if extracted with valid value
    if (ocrData.amount && ocrData.amount > 0) {
      form.setValue('amount', ocrData.amount);
    }

    // Auto-populate description with vendor if extracted and field is empty
    if (ocrData.vendor) {
      const currentDescription = form.getValues('description');
      if (!currentDescription || currentDescription.trim() === '') {
        form.setValue('description', ocrData.vendor);
      }
    }

    // Auto-populate date if extracted and valid
    if (ocrData.date) {
      try {
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue('date', parsedDate);
        }
      } catch (error) {
        // Invalid date format from OCR - user can manually enter
      }
    }

    // Store OCR metadata for audit trail and future reference
    form.setValue('ocrText', ocrData.rawText);
    form.setValue('ocrConfidence', ocrData.confidence.toString());
    form.setValue('ocrAmount', ocrData.amount?.toString());
    form.setValue('ocrVendor', ocrData.vendor);
    if (ocrData.date) {
      try {
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue('ocrDate', parsedDate);
        }
      } catch (error) {
        // Invalid OCR date format
      }
    }
    form.setValue('ocrMetadata', {
      confidence: ocrData.confidence,
      extractedAmount: ocrData.amount,
      extractedVendor: ocrData.vendor,
      extractedDate: ocrData.date,
    });
  }, [form]);

  // Sync form state when dialog opens/closes or selectedExpense changes
  // This ensures form is properly populated for editing or reset for creating
  useEffect(() => {
    if (showAddDialog) {
      if (selectedExpense) {
        // Editing existing expense - populate form INCLUDING OCR fields to prevent data loss
        form.reset({
          category: selectedExpense.category,
          amount: parseFloat(selectedExpense.amount),
          date: new Date(selectedExpense.date),
          description: selectedExpense.description || "",
          jobId: selectedExpense.jobId || undefined,
          receiptUrl: selectedExpense.receiptUrl || "",
          isDeductible: selectedExpense.isDeductible,
          // Preserve OCR data to prevent data loss on edit
          ocrText: selectedExpense.ocrText || undefined,
          ocrConfidence: selectedExpense.ocrConfidence || undefined,
          ocrAmount: selectedExpense.ocrAmount || undefined,
          ocrVendor: selectedExpense.ocrVendor || undefined,
          ocrDate: selectedExpense.ocrDate ? new Date(selectedExpense.ocrDate) : undefined,
          ocrMetadata: selectedExpense.ocrMetadata || undefined,
        });
      } else {
        // Creating new expense - reset to defaults
        form.reset(DEFAULT_EXPENSE_FORM_VALUES);
      }
    }
  }, [showAddDialog, selectedExpense, form]);

  // Fetch all expenses with retry for network resilience
  // Uses hierarchical query key for proper cache invalidation
  const { data: expenses, isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
    retry: 2, // Retry failed requests twice before showing error
  });

  // Fetch jobs for linking expenses to specific jobs
  // Provides dropdown options in expense creation/edit dialog
  const { data: jobs, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery({
    queryKey: ["/api/jobs"],
    retry: 2, // Retry for resilience
  });

  // Create expense mutation with optimistic updates and cache invalidation
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      setShowAddDialog(false);
      form.reset(DEFAULT_EXPENSE_FORM_VALUES);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update expense mutation with cache invalidation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExpense> }) => {
      return apiRequest("PUT", `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense updated",
      });
      setShowAddDialog(false);
      setSelectedExpense(null);
      form.reset(DEFAULT_EXPENSE_FORM_VALUES);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation with error handling
  // Keeps dialog open on error for inline retry
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense deleted",
      });
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      // CRITICAL: Keep dialog open on error for inline retry
      setDeleteError(error.message);
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Memoized currency formatter for performance optimization
  // Cache the Intl.NumberFormat instance to avoid recreating on every render
  const currencyFormatter = useMemo(() => 
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }),
  []);

  // Memoized formatting function that reuses the cached formatter instance
  const formatCurrency = useCallback((amount: number) => 
    currencyFormatter.format(amount),
  [currencyFormatter]);

  // Memoized filtered expenses based on search query and category filter
  // Only recalculates when expenses, searchQuery, or categoryFilter changes
  const filteredExpenses = useMemo(() => {
    return expenses?.filter((expense: Expense) => {
      const matchesSearch = !searchQuery || 
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  // Memoized statistics calculation to avoid recalculating on every render
  // Calculates total expenses, tax deductible amount, and entry count
  const stats = useMemo(() => {
    return {
      total: expenses?.reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
      deductible: expenses?.filter((e: Expense) => e.isDeductible)
        .reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
      count: expenses?.length || 0,
    };
  }, [expenses]);

  // Memoized category statistics for expense breakdown view
  // Groups expenses by category and calculates totals and percentages
  const categoryStats = useMemo(() => {
    return EXPENSE_CATEGORIES.map(cat => ({
      category: cat.label,
      value: cat.value,
      total: expenses?.filter((e: Expense) => e.category === cat.value)
        .reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
    })).filter(stat => stat.total > 0);
  }, [expenses]);

  // Form submission handler with validation
  // Validates amount and date before creating or updating expense
  const onSubmit = useCallback((data: InsertExpense) => {
    // CRITICAL: Validate amount is positive
    const amount = parseFloat(data.amount.toString());
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Expense amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    // CRITICAL: Validate date is not in the future
    const expenseDate = new Date(data.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (expenseDate > today) {
      toast({
        title: "Invalid Date",
        description: "Expense date cannot be in the future",
        variant: "destructive",
      });
      return;
    }

    // Validate date is not too far in the past (10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    
    if (expenseDate < tenYearsAgo) {
      toast({
        title: "Invalid Date",
        description: "Expense date seems too far in the past. Please verify.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedExpense) {
      updateMutation.mutate({ id: selectedExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [selectedExpense, createMutation, updateMutation, toast]);

  // Export expenses to CSV with current filters applied
  const exportToCSV = useCallback(() => {
    const params = new URLSearchParams();
    if (categoryFilter !== "all") {
      params.append("category", categoryFilter);
    }
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    window.location.href = `/api/expenses/export?format=csv&${params.toString()}`;
    toast({
      title: "Exporting",
      description: "Your expense report is being downloaded",
    });
  }, [categoryFilter, searchQuery, toast]);

  // Handler to open add expense dialog
  const handleAddExpense = useCallback(() => {
    setSelectedExpense(null);
    form.reset(DEFAULT_EXPENSE_FORM_VALUES);
    setShowAddDialog(true);
  }, [form]);

  // Handler to open edit expense dialog
  const handleEditExpense = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setShowAddDialog(true);
  }, []);

  // Handler to open delete confirmation dialog
  const handleDeleteExpense = useCallback((expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  // Handler to confirm delete action
  const handleConfirmDelete = useCallback(() => {
    if (expenseToDelete) {
      deleteMutation.mutate(expenseToDelete);
    }
  }, [expenseToDelete, deleteMutation]);

  // Handler for search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handler for category filter change
  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
  }, []);

  // Handler for dialog close
  const handleDialogClose = useCallback(() => {
    setShowAddDialog(false);
    setSelectedExpense(null);
    form.reset(DEFAULT_EXPENSE_FORM_VALUES);
  }, [form]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Expenses</h1>
            <p className="text-muted-foreground" data-testid="text-page-description">Track business expenses and receipts</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button onClick={handleAddExpense} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {expensesLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : expensesError ? (
            <Card className="sm:col-span-3" data-testid="error-stats">
              <CardContent className="pt-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load expense statistics</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchExpenses()}
                      data-testid="button-retry-stats"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card data-testid="card-total-expenses">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Expenses</p>
                      <p className="text-2xl font-bold" data-testid="text-total-expenses">
                        {formatCurrency(stats.total)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-deductible">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Deductible</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-deductible-amount">
                        {formatCurrency(stats.deductible)}
                      </p>
                    </div>
                    <Receipt className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-total-entries">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Entries</p>
                      <p className="text-2xl font-bold" data-testid="text-total-count">
                        {stats.count}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabs-expense-view">
            <TabsTrigger value="list" data-testid="tab-list">Expense List</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">By Category</TabsTrigger>
          </TabsList>

          {/* List View Tab */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card data-testid="card-filters">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10"
                      data-testid="input-search-expenses"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="category-option-all">All Categories</SelectItem>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} data-testid={`category-option-${cat.value}`}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Expense List */}
            <Card data-testid="card-expense-list">
              <CardHeader>
                <CardTitle data-testid="text-list-title">Recent Expenses</CardTitle>
                <CardDescription data-testid="text-list-description">View and manage expense records</CardDescription>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <ExpenseTableSkeleton />
                ) : expensesError ? (
                  <Alert variant="destructive" data-testid="error-expense-list">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load expenses: {expensesError.message}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchExpenses()}
                        data-testid="button-retry-expenses"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : filteredExpenses && filteredExpenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table data-testid="table-expenses">
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-date">Date</TableHead>
                          <TableHead data-testid="header-description">Description</TableHead>
                          <TableHead data-testid="header-category">Category</TableHead>
                          <TableHead data-testid="header-receipt">Receipt</TableHead>
                          <TableHead data-testid="header-job">Job</TableHead>
                          <TableHead data-testid="header-amount">Amount</TableHead>
                          <TableHead data-testid="header-deductible">Deductible</TableHead>
                          <TableHead className="text-right" data-testid="header-actions">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense: Expense) => (
                          <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                            <TableCell data-testid={`expense-date-${expense.id}`}>
                              {format(new Date(expense.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-xs truncate" data-testid={`expense-description-${expense.id}`}>
                              {expense.description}
                            </TableCell>
                            <TableCell data-testid={`expense-category-${expense.id}`}>
                              <Badge variant="secondary">
                                {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`expense-receipt-${expense.id}`}>
                              {expense.receiptUrl ? (
                                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-receipt-${expense.id}`}>
                                  <Receipt className="h-5 w-5 text-green-600" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground" data-testid={`no-receipt-${expense.id}`}>—</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`expense-job-${expense.id}`}>
                              {expense.jobId ? (
                                <Link href={`/jobs/${expense.jobId}`}>
                                  <Button variant="link" size="sm" className="p-0" data-testid={`link-job-${expense.id}`}>
                                    Job #{expense.jobId}
                                  </Button>
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Overhead</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold" data-testid={`expense-amount-${expense.id}`}>
                              {formatCurrency(parseFloat(expense.amount))}
                            </TableCell>
                            <TableCell data-testid={`expense-deductible-${expense.id}`}>
                              {expense.isDeductible ? (
                                <Badge className="bg-green-500" data-testid={`badge-deductible-yes-${expense.id}`}>Yes</Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-deductible-no-${expense.id}`}>No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                  data-testid={`button-edit-expense-${expense.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  data-testid={`button-delete-expense-${expense.id}`}
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-expenses">
                    <Receipt className="h-12 w-12 mx-auto mb-4" />
                    <p className="mb-2">No expenses found</p>
                    {searchQuery || categoryFilter !== "all" ? (
                      <p className="text-sm">Try adjusting your filters</p>
                    ) : (
                      <Button 
                        className="mt-4" 
                        onClick={handleAddExpense}
                        data-testid="button-create-first-expense"
                      >
                        Add your first expense
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Breakdown Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card data-testid="card-category-breakdown">
              <CardHeader>
                <CardTitle data-testid="text-category-title">Expenses by Category</CardTitle>
                <CardDescription data-testid="text-category-description">Breakdown of spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <ExpenseTableSkeleton />
                ) : expensesError ? (
                  <Alert variant="destructive" data-testid="error-category-breakdown">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load category breakdown</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchExpenses()}
                        data-testid="button-retry-categories"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : categoryStats.length > 0 ? (
                  <div className="space-y-4">
                    {categoryStats.map((stat) => (
                      <div 
                        key={stat.value} 
                        className="flex items-center justify-between p-3 rounded-lg border"
                        data-testid={`category-stat-${stat.value}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Tag className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium" data-testid={`category-name-${stat.value}`}>{stat.category}</p>
                            <p className="text-sm text-muted-foreground" data-testid={`category-count-${stat.value}`}>
                              {expenses?.filter((e: Expense) => e.category === stat.value).length} entries
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg" data-testid={`category-amount-${stat.value}`}>
                            {formatCurrency(stat.total)}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`category-percentage-${stat.value}`}>
                            {((stat.total / stats.total) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-state-categories">
                    <Tag className="h-12 w-12 mx-auto mb-4" />
                    <p>No expense categories to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-expense-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Enter expense details and attach receipt if available
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-expense-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-category-form">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem 
                              key={cat.value} 
                              value={cat.value}
                              data-testid={`category-form-option-${cat.value}`}
                            >
                              {cat.label}
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
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-expense-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link to Job (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-job">
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="job-option-none">No Job (Overhead)</SelectItem>
                          {jobsLoading ? (
                            <SelectItem value="loading" disabled>Loading jobs...</SelectItem>
                          ) : jobsError ? (
                            <SelectItem value="error" disabled>Failed to load jobs</SelectItem>
                          ) : (
                            jobs?.map((job: any) => (
                              <SelectItem 
                                key={job.id} 
                                value={job.id}
                                data-testid={`job-option-${job.id}`}
                              >
                                {job.address} - {job.builderName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter expense description..."
                        {...field}
                        data-testid="input-expense-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Photo</FormLabel>
                    <FormControl>
                      <ReceiptUpload
                        value={field.value || undefined}
                        onChange={(url) => field.onChange(url)}
                        onOcrComplete={handleOcrComplete}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Take a photo or upload an image of your receipt. Data will be extracted automatically.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isDeductible"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-expense-deductible"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Tax Deductible</FormLabel>
                      <FormDescription>
                        Check if this expense is tax deductible
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel-expense"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-expense"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Expense"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-title">Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              This action cannot be undone. This will permanently delete the expense record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" data-testid="error-delete">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setExpenseToDelete(null);
                setDeleteError(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
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

// Export with ErrorBoundary wrapper for production resilience
export default function Expenses() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="error-boundary-fallback">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-4">
              <div>
                <p className="font-semibold">Something went wrong</p>
                <p className="text-sm">The expense management page encountered an error. Please refresh to try again.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <ExpensesContent />
    </ErrorBoundary>
  );
}
