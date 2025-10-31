import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { insertExpenseSchema, type InsertExpense, type Expense } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { format } from "date-fns";
import { ReceiptUpload, type OcrResult } from "@/components/expenses/ReceiptUpload";

const expenseCategories = [
  { value: "fuel", label: "Fuel", icon: "⛽" },
  { value: "equipment", label: "Equipment", icon: "🔧" },
  { value: "supplies", label: "Supplies", icon: "📦" },
  { value: "meals", label: "Meals", icon: "🍽️" },
  { value: "lodging", label: "Lodging", icon: "🏨" },
  { value: "office", label: "Office", icon: "📎" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "vehicle", label: "Vehicle Maintenance", icon: "🚗" },
  { value: "tools", label: "Tools", icon: "🔨" },
  { value: "software", label: "Software", icon: "💻" },
  { value: "advertising", label: "Advertising", icon: "📣" },
  { value: "professional", label: "Professional Services", icon: "👔" },
  { value: "other", label: "Other", icon: "📋" },
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

function SwipeCard({ expense, onSwipeLeft, onSwipeRight, index, totalCards }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  const categoryInfo = expenseCategories.find(c => c.value === expense.category);

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
                {categoryInfo?.icon} {categoryInfo?.label}
              </Badge>
            </div>

            {/* OCR Confidence */}
            {expense.ocrConfidence && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>OCR: {parseFloat(expense.ocrConfidence).toFixed(0)}% confident</span>
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

export default function ExpensesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: defaultExpenseFormValues,
  });

  // Fetch expenses by approval status
  const { data: pendingExpenses, isLoading: pendingLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { approvalStatus: "pending" }],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const allExpenses = await response.json();
      return allExpenses.filter((e: Expense) => e.approvalStatus === "pending");
    },
  });

  const { data: approvedExpenses, isLoading: approvedLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", { approvalStatus: "approved" }],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      const allExpenses = await response.json();
      return allExpenses.filter((e: Expense) => e.approvalStatus === "approved");
    },
  });

  const { data: allExpenses, isLoading: allLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
    enabled: user?.role === "admin",
  });

  // Handle OCR completion
  const handleOcrComplete = (ocrData: OcrResult) => {
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
        // Invalid date format from OCR
      }
    }

    // Store OCR metadata
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
        // Invalid OCR date format
      }
    }
  };

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
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

  const handleSwipeRight = (expense: Expense) => {
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
  };

  const handleSwipeLeft = (expense: Expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: {
        approvalStatus: "rejected",
        swipeClassification: "personal",
      },
    });
    toast({
      title: "Rejected",
      description: `Expense rejected: $${parseFloat(expense.amount).toFixed(2)}`,
      variant: "destructive",
    });
  };

  const handleBulkApprove = () => {
    if (!pendingExpenses || pendingExpenses.length === 0) return;
    bulkApproveMutation.mutate(pendingExpenses.map(e => e.id));
  };

  const onSubmit = (data: InsertExpense) => {
    createMutation.mutate(data);
  };

  const filteredApprovedExpenses = approvedExpenses?.filter((expense: Expense) => {
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesCategory;
  });

  const filteredAllExpenses = allExpenses?.filter((expense: Expense) => {
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesCategory;
  });

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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All ({pendingExpenses.length})
                </Button>
              </div>
            )}

            {pendingLoading ? (
              <div className="space-y-3">
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
              <Card>
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
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </SelectItem>
                      ))}
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
                {approvedLoading ? (
                  <div className="space-y-3">
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
                                  {categoryInfo?.icon} {categoryInfo?.label}
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
                  <div className="text-center py-12 text-muted-foreground">
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
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter-all">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))}
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
                  {allLoading ? (
                    <div className="space-y-3">
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
                                    {categoryInfo?.icon} {categoryInfo?.label}
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
                    <div className="text-center py-12 text-muted-foreground">
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
                          {expenseCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </SelectItem>
                          ))}
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
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "Adding..." : "Add Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
