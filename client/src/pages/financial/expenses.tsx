import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertExpenseSchema, type InsertExpense, type Expense } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Receipt,
  Plus,
  Camera,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  DollarSign,
  Filter,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Fuel,
  Wrench,
  Package,
  Utensils,
  Hotel,
  Paperclip,
  Shield,
  Car,
  Hammer,
  Laptop,
  Megaphone,
  Briefcase,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ReceiptUpload, type OcrResult } from "@/components/expenses/ReceiptUpload";

// Phase 2 - BUILD & Phase 3 - OPTIMIZE: Module-level constant for expense category icons
// Replaces emoji with lucide-react icons following Equipment.tsx pattern
// Prevents recreation on every render and uses proper icon components
const EXPENSE_CATEGORY_ICONS = {
  fuel: Fuel,
  equipment: Wrench,
  supplies: Package,
  meals: Utensils,
  lodging: Hotel,
  office: Paperclip,
  insurance: Shield,
  vehicle: Car,
  tools: Hammer,
  software: Laptop,
  advertising: Megaphone,
  professional: Briefcase,
  other: FileText,
} as const;

// Phase 6 - DOCUMENT: Expense category configuration with lucide icons
// Each category has a value (database), label (display), and icon component
const expenseCategories = [
  { value: "fuel", label: "Fuel", IconComponent: Fuel },
  { value: "equipment", label: "Equipment", IconComponent: Wrench },
  { value: "supplies", label: "Supplies", IconComponent: Package },
  { value: "meals", label: "Meals", IconComponent: Utensils },
  { value: "lodging", label: "Lodging", IconComponent: Hotel },
  { value: "office", label: "Office", IconComponent: Paperclip },
  { value: "insurance", label: "Insurance", IconComponent: Shield },
  { value: "vehicle", label: "Vehicle Maintenance", IconComponent: Car },
  { value: "tools", label: "Tools", IconComponent: Hammer },
  { value: "software", label: "Software", IconComponent: Laptop },
  { value: "advertising", label: "Advertising", IconComponent: Megaphone },
  { value: "professional", label: "Professional Services", IconComponent: Briefcase },
  { value: "other", label: "Other", IconComponent: FileText },
];

const defaultExpenseFormValues: Partial<InsertExpense> = {
  category: "supplies",
  amount: 0,
  date: new Date(),
  description: "",
  jobId: undefined,
  receiptUrl: "",
  isDeductible: true,
  approvalStatus: "pending",
  swipeClassification: undefined,
};

interface SwipeCardProps {
  expense: Expense;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  index: number;
  totalCards: number;
}

// Phase 6 - DOCUMENT: Swipe card component for expense approval/rejection workflow
// Supports drag gestures: swipe right to approve, swipe left to reject
// Shows expense details, receipt image, OCR confidence, and visual swipe indicators
function SwipeCard({ expense, onSwipeLeft, onSwipeRight, index, totalCards }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const categoryInfo = expenseCategories.find(c => c.value === expense.category);
  const CategoryIcon = categoryInfo?.IconComponent || FileText;

  // Phase 6 - DOCUMENT: Swipe gesture handler
  // Threshold of 100px determines approval (right) or rejection (left)
  // Animates card exit after swipe completes
  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      setExitX(1000);
      onSwipeRight();
    } else if (info.offset.x < -threshold) {
      setExitX(-1000);
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 1 - index * 0.05, y: index * 10, opacity: 1 }}
      animate={{ scale: 1 - index * 0.05, y: index * 10, opacity: 1 }}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.3 } }}
      style={{
        position: "absolute",
        width: "100%",
        cursor: "grab",
        zIndex: totalCards - index,
      }}
      whileDrag={{ cursor: "grabbing", scale: 1.05 }}
      data-testid={`swipe-card-${expense.id}`}
    >
      <Card className="shadow-lg border-2">
        <CardContent className="p-6">
          {/* Swipe Indicators */}
          <motion.div
            className="absolute top-6 left-6 bg-green-500 text-white px-4 py-2 rounded-md font-bold text-lg"
            initial={{ opacity: 0 }}
            whileDrag={(_, info: any) => ({
              opacity: Math.min(info.offset.x / 100, 1),
            })}
          >
            <CheckCircle className="inline mr-2 h-5 w-5" />
            APPROVE
          </motion.div>
          <motion.div
            className="absolute top-6 right-6 bg-red-500 text-white px-4 py-2 rounded-md font-bold text-lg"
            initial={{ opacity: 0 }}
            whileDrag={(_, info: any) => ({
              opacity: Math.min(-info.offset.x / 100, 1),
            })}
          >
            REJECT
            <XCircle className="inline ml-2 h-5 w-5" />
          </motion.div>

          <div className="space-y-4 mt-8">
            {/* Receipt Thumbnail */}
            {expense.receiptUrl && (
              <div className="w-full h-48 bg-muted rounded-md overflow-hidden">
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                  data-testid={`receipt-image-${expense.id}`}
                />
              </div>
            )}

            {/* Amount */}
            <div className="text-center">
              <p className="text-4xl font-bold" data-testid={`expense-amount-${expense.id}`}>
                ${parseFloat(expense.amount).toFixed(2)}
              </p>
            </div>

            {/* Vendor/Description */}
            {expense.description && (
              <div className="text-center">
                <p className="text-xl font-semibold text-muted-foreground" data-testid={`expense-vendor-${expense.id}`}>
                  {expense.description}
                </p>
              </div>
            )}

            {/* Date & Category */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm" data-testid={`expense-date-${expense.id}`}>
                  {format(new Date(expense.date), "MMM d, yyyy")}
                </span>
              </div>
              <Badge variant="secondary" data-testid={`expense-category-${expense.id}`}>
                <CategoryIcon className="h-4 w-4 mr-1" />
                {categoryInfo?.label}
              </Badge>
            </div>

            {/* OCR Confidence */}
            {expense.ocrConfidence && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span data-testid={`ocr-confidence-${expense.id}`}>
                  OCR: {parseFloat(expense.ocrConfidence).toFixed(0)}% confident
                </span>
              </div>
            )}
          </div>

          {/* Swipe Instructions */}
          <div className="mt-6 pt-4 border-t flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-red-500" />
              <span>Swipe left to reject</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Swipe right to approve</span>
              <ArrowRight className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Phase 2 - BUILD: Main expenses content component with production-ready features
function ExpensesContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [expenseToReject, setExpenseToReject] = useState<Expense | null>(null);

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: defaultExpenseFormValues,
  });

  // Phase 5 - HARDEN: Fetch pending expenses with retry for resilience
  const { 
    data: pendingExpenses, 
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending
  } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { approvalStatus: "pending" }],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const allExpenses = await response.json();
      return allExpenses.filter((e: Expense) => e.approvalStatus === "pending");
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch approved expenses with retry
  const { 
    data: approvedExpenses, 
    isLoading: approvedLoading,
    error: approvedError,
    refetch: refetchApproved
  } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { approvalStatus: "approved" }],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const allExpenses = await response.json();
      return allExpenses.filter((e: Expense) => e.approvalStatus === "approved");
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Fetch all expenses (admin only) with retry
  const { 
    data: allExpenses, 
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll
  } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: user?.role === "admin",
    retry: 2,
  });

  // Phase 6 - DOCUMENT: OCR completion handler
  // Automatically fills form fields when receipt OCR completes
  // Populates amount, vendor, date from extracted text with validation
  const handleOcrComplete = useCallback((ocrData: OcrResult) => {
    if (ocrData.amount && ocrData.amount > 0) {
      form.setValue("amount", ocrData.amount);
    }
    if (ocrData.vendor) {
      form.setValue("description", ocrData.vendor);
    }
    if (ocrData.date) {
      try {
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue("date", parsedDate);
        }
      } catch (error) {
        // Invalid date format from OCR - silently skip
      }
    }

    // Store OCR metadata for audit trail
    form.setValue("ocrText", ocrData.rawText);
    form.setValue("ocrConfidence", ocrData.confidence.toString());
    form.setValue("ocrAmount", ocrData.amount?.toString());
    form.setValue("ocrVendor", ocrData.vendor);
    if (ocrData.date) {
      try {
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue("ocrDate", parsedDate);
        }
      } catch (error) {
        // Invalid OCR date format - silently skip
      }
    }
  }, [form]);

  // Phase 5 - HARDEN: Create expense mutation with validation
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      // Phase 5 - HARDEN: Validate amount is positive
      if (data.amount <= 0) {
        throw new Error("Amount must be greater than zero");
      }
      return apiRequest("/api/expenses", { method: "POST", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      setShowAddDialog(false);
      form.reset(defaultExpenseFormValues);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update expense mutation (for swipe actions)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExpense> }) => {
      return apiRequest(`/api/expenses/${id}`, { method: "PATCH", body: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (expenseIds: string[]) => {
      return Promise.all(
        expenseIds.map(id =>
          apiRequest(`/api/expenses/${id}`, {
            method: "PATCH",
            body: { approvalStatus: "approved" },
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "All pending expenses approved",
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized swipe right handler with useCallback
  const handleSwipeRight = useCallback((expense: Expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: {
        approvalStatus: "approved",
        swipeClassification: "business",
      },
    });
    toast({
      title: "Approved",
      description: `Expense approved: $${parseFloat(expense.amount).toFixed(2)}`,
    });
  }, [updateMutation, toast]);

  // Phase 2 - BUILD & Phase 5 - HARDEN: Swipe left handler with confirmation
  // Opens confirmation dialog instead of immediate rejection
  const handleSwipeLeft = useCallback((expense: Expense) => {
    setExpenseToReject(expense);
    setShowRejectDialog(true);
  }, []);

  // Phase 5 - HARDEN: Confirmed rejection handler
  const confirmReject = useCallback(() => {
    if (!expenseToReject) return;
    
    updateMutation.mutate({
      id: expenseToReject.id,
      data: {
        approvalStatus: "rejected",
        swipeClassification: "personal",
      },
    });
    toast({
      title: "Rejected",
      description: `Expense rejected: $${parseFloat(expenseToReject.amount).toFixed(2)}`,
      variant: "destructive",
    });
    setShowRejectDialog(false);
    setExpenseToReject(null);
  }, [expenseToReject, updateMutation, toast]);

  // Phase 3 - OPTIMIZE: Memoized bulk approve handler
  const handleBulkApprove = useCallback(() => {
    if (!pendingExpenses || pendingExpenses.length === 0) return;
    bulkApproveMutation.mutate(pendingExpenses.map(e => e.id));
  }, [pendingExpenses, bulkApproveMutation]);

  // Phase 3 - OPTIMIZE: Memoized form submit handler
  const onSubmit = useCallback((data: InsertExpense) => {
    createMutation.mutate(data);
  }, [createMutation]);

  // Phase 3 - OPTIMIZE: Memoized filter logic for approved expenses
  // Only recalculates when data or filter changes
  const filteredApprovedExpenses = useMemo(() => {
    if (!approvedExpenses) return [];
    
    return approvedExpenses.filter((expense: Expense) => {
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      return matchesCategory;
    });
  }, [approvedExpenses, categoryFilter]);

  // Phase 3 - OPTIMIZE: Memoized filter logic for all expenses
  const filteredAllExpenses = useMemo(() => {
    if (!allExpenses) return [];
    
    return allExpenses.filter((expense: Expense) => {
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      return matchesCategory;
    });
  }, [allExpenses, categoryFilter]);

  // Phase 3 - OPTIMIZE: Memoized event handlers
  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl pb-24">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">
              Expense Tracking
            </h1>
            <p className="text-muted-foreground">Swipe to categorize and approve expenses</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending
              {pendingExpenses && pendingExpenses.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingExpenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved
            </TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="all" data-testid="tab-all">
                All
              </TabsTrigger>
            )}
          </TabsList>

          {/* Pending Tab - Swipe Cards */}
          <TabsContent value="pending" className="space-y-4">
            {user?.role === "admin" && pendingExpenses && pendingExpenses.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkApproveMutation.isPending}
                  data-testid="button-bulk-approve"
                >
                  {bulkApproveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve All ({pendingExpenses.length})
                </Button>
              </div>
            )}

            {/* Phase 2 - BUILD: Error state with retry */}
            {pendingError ? (
              <Alert variant="destructive" data-testid="alert-pending-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Failed to load pending expenses. {(pendingError as Error).message}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchPending()}
                    data-testid="button-retry-pending"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : pendingLoading ? (
              <div className="space-y-3" data-testid="skeleton-pending">
                <Skeleton className="h-96 w-full" />
              </div>
            ) : pendingExpenses && pendingExpenses.length > 0 ? (
              <div className="relative h-[500px]" data-testid="swipe-container">
                <AnimatePresence>
                  {pendingExpenses.slice(0, 3).map((expense, index) => (
                    <SwipeCard
                      key={expense.id}
                      expense={expense}
                      onSwipeLeft={() => handleSwipeLeft(expense)}
                      onSwipeRight={() => handleSwipeRight(expense)}
                      index={index}
                      totalCards={Math.min(3, pendingExpenses.length)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card data-testid="empty-pending">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-semibold">All caught up!</p>
                  <p className="text-muted-foreground">No pending expenses to review</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Approved Tab - List View */}
          <TabsContent value="approved" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {expenseCategories.map(cat => {
                        const Icon = cat.IconComponent;
                        return (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Expense List */}
            <Card>
              <CardHeader>
                <CardTitle>Approved Expenses</CardTitle>
                <CardDescription>View approved expense records</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Phase 2 - BUILD: Error state with retry */}
                {approvedError ? (
                  <Alert variant="destructive" data-testid="alert-approved-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load approved expenses. {(approvedError as Error).message}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetchApproved()}
                        data-testid="button-retry-approved"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : approvedLoading ? (
                  <div className="space-y-3" data-testid="skeleton-approved">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredApprovedExpenses && filteredApprovedExpenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApprovedExpenses.map((expense: Expense) => {
                          const categoryInfo = expenseCategories.find(c => c.value === expense.category);
                          const CategoryIcon = categoryInfo?.IconComponent || FileText;
                          return (
                            <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                              <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {expense.description || "—"}
                              </TableCell>
                              <TableCell className="font-semibold">
                                ${parseFloat(expense.amount).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  <CategoryIcon className="h-4 w-4 mr-1" />
                                  {categoryInfo?.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {expense.receiptUrl ? (
                                  <a
                                    href={expense.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-receipt-${expense.id}`}
                                  >
                                    <Receipt className="h-5 w-5 text-green-600" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-approved">
                    <Receipt className="h-12 w-12 mx-auto mb-4" />
                    <p>No approved expenses found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Tab - List View (Admin Only) */}
          {user?.role === "admin" && (
            <TabsContent value="all" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                      <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter-all">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {expenseCategories.map(cat => {
                          const Icon = cat.IconComponent;
                          return (
                            <SelectItem key={cat.value} value={cat.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {cat.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Expense List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Expenses</CardTitle>
                  <CardDescription>View all expense records</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Phase 2 - BUILD: Error state with retry */}
                  {allError ? (
                    <Alert variant="destructive" data-testid="alert-all-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Failed to load all expenses. {(allError as Error).message}</span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => refetchAll()}
                          data-testid="button-retry-all"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : allLoading ? (
                    <div className="space-y-3" data-testid="skeleton-all">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : filteredAllExpenses && filteredAllExpenses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Receipt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAllExpenses.map((expense: Expense) => {
                            const categoryInfo = expenseCategories.find(c => c.value === expense.category);
                            const CategoryIcon = categoryInfo?.IconComponent || FileText;
                            return (
                              <TableRow key={expense.id} data-testid={`expense-row-all-${expense.id}`}>
                                <TableCell>{format(new Date(expense.date), "MMM d, yyyy")}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {expense.description || "—"}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  ${parseFloat(expense.amount).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    <CategoryIcon className="h-4 w-4 mr-1" />
                                    {categoryInfo?.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      expense.approvalStatus === "approved"
                                        ? "default"
                                        : expense.approvalStatus === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    data-testid={`badge-status-${expense.id}`}
                                  >
                                    {expense.approvalStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {expense.receiptUrl ? (
                                    <a
                                      href={expense.receiptUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      data-testid={`link-receipt-all-${expense.id}`}
                                    >
                                      <Receipt className="h-5 w-5 text-green-600" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground" data-testid="empty-all">
                      <Receipt className="h-12 w-12 mx-auto mb-4" />
                      <p>No expenses found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Phase 2 - BUILD & Phase 5 - HARDEN: Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent data-testid="dialog-confirm-reject">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this expense of{" "}
              <strong>${expenseToReject ? parseFloat(expenseToReject.amount).toFixed(2) : "0.00"}</strong>?
              This action will mark it as personal/non-deductible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-reject"
            >
              Reject Expense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => {
            setSelectedExpense(null);
            form.reset(defaultExpenseFormValues);
            setShowAddDialog(true);
          }}
          className="rounded-full h-14 w-14 shadow-lg"
          data-testid="fab-add-expense"
        >
          <Camera className="h-6 w-6" />
        </Button>
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Capture receipt and enter expense details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Receipt Upload with OCR */}
              <FormField
                control={form.control}
                name="receiptUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Photo</FormLabel>
                    <FormControl>
                      <ReceiptUpload
                        value={field.value}
                        onChange={field.onChange}
                        onOcrComplete={handleOcrComplete}
                      />
                    </FormControl>
                    <FormDescription>
                      Take a photo or upload a receipt. Text will be extracted automatically.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* OCR Confidence Indicator */}
              {form.watch("ocrConfidence") && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm">
                    OCR extracted data with {parseFloat(form.watch("ocrConfidence") || "0").toFixed(0)}% confidence
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
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
                            className="pl-10"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-amount"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map(cat => {
                            const Icon = cat.IconComponent;
                            return (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {cat.label}
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

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={
                            field.value
                              ? format(new Date(field.value), "yyyy-MM-dd")
                              : ""
                          }
                          onChange={e => field.onChange(new Date(e.target.value))}
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vendor/Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Shell Gas Station"
                          {...field}
                          data-testid="input-vendor"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about this expense..."
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  disabled={createMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Expense"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with fallback UI
// Catches runtime errors and displays user-friendly error message with retry
export default function ExpensesPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Card data-testid="error-boundary-fallback">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load the expenses page. Please try refreshing.
              </p>
              <Button onClick={() => window.location.reload()} data-testid="button-reload">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ExpensesContent />
    </ErrorBoundary>
  );
}
