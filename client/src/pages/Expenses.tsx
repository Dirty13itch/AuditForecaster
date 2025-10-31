import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type InsertExpense, type Expense } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  Trash,
  Edit,
  Camera,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { ReceiptUpload, type OcrResult } from "@/components/expenses/ReceiptUpload";

const expenseCategories = [
  { value: "fuel", label: "Fuel" },
  { value: "equipment", label: "Equipment" },
  { value: "supplies", label: "Supplies" },
  { value: "meals", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "office", label: "Office" },
  { value: "insurance", label: "Insurance" },
  { value: "vehicle", label: "Vehicle Maintenance" },
  { value: "tools", label: "Tools" },
  { value: "software", label: "Software" },
  { value: "advertising", label: "Advertising" },
  { value: "professional", label: "Professional Services" },
  { value: "other", label: "Other" },
];

// Default form values (reused for creating new expenses and resetting)
const defaultExpenseFormValues: Partial<InsertExpense> = {
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

export default function Expenses() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  const form = useForm<InsertExpense>({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: defaultExpenseFormValues,
  });

  // Handle OCR completion - auto-populate form fields
  const handleOcrComplete = (ocrData: OcrResult) => {
    // Auto-populate amount if extracted
    if (ocrData.amount && ocrData.amount > 0) {
      form.setValue('amount', ocrData.amount);
    }

    // Auto-populate description with vendor if extracted
    if (ocrData.vendor) {
      const currentDescription = form.getValues('description');
      if (!currentDescription || currentDescription.trim() === '') {
        form.setValue('description', ocrData.vendor);
      }
    }

    // Auto-populate date if extracted
    if (ocrData.date) {
      try {
        const parsedDate = new Date(ocrData.date);
        if (!isNaN(parsedDate.getTime())) {
          form.setValue('date', parsedDate);
        }
      } catch (error) {
        // Invalid date format from OCR
      }
    }

    // Store OCR metadata for database
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
  };

  // Sync form state when dialog opens/closes or selectedExpense changes
  useEffect(() => {
    if (showAddDialog) {
      if (selectedExpense) {
        // Editing existing expense - populate form INCLUDING OCR fields
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
        form.reset(defaultExpenseFormValues);
      }
    }
  }, [showAddDialog, selectedExpense, form]);

  // Fetch expenses
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/expenses"],
    queryFn: async () => {
      const response = await fetch("/api/expenses");
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return response.json();
    },
  });

  // Fetch jobs for linking
  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Create expense mutation
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

  // Update expense mutation
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
      form.reset(defaultExpenseFormValues);
    },
  });

  // Delete expense mutation
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
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredExpenses = expenses?.filter((expense: Expense) => {
    const matchesSearch = !searchQuery || 
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: expenses?.reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
    deductible: expenses?.filter((e: Expense) => e.isDeductible)
      .reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
    count: expenses?.length || 0,
  };

  const categoryStats = expenseCategories.map(cat => ({
    category: cat.label,
    value: cat.value,
    total: expenses?.filter((e: Expense) => e.category === cat.value)
      .reduce((sum: number, e: Expense) => sum + parseFloat(e.amount), 0) || 0,
  })).filter(stat => stat.total > 0);

  const onSubmit = (data: InsertExpense) => {
    if (selectedExpense) {
      updateMutation.mutate({ id: selectedExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const exportToCSV = () => {
    window.location.href = "/api/expenses/export?format=csv";
    toast({
      title: "Exporting",
      description: "Your expense report is being downloaded",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">Expenses</h1>
            <p className="text-muted-foreground">Track business expenses and receipts</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={exportToCSV}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button onClick={() => {
              setSelectedExpense(null);
              form.reset(defaultExpenseFormValues);
              setShowAddDialog(true);
            }} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tax Deductible</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-deductible">
                    {formatCurrency(stats.deductible)}
                  </p>
                </div>
                <Receipt className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold" data-testid="text-total-entries">
                    {stats.count}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="list">Expense List</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
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
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>View and manage expense records</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredExpenses?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Deductible</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense: Expense) => (
                          <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                            <TableCell>
                              {format(new Date(expense.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {expense.description}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {expenseCategories.find(c => c.value === expense.category)?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {expense.receiptUrl ? (
                                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-receipt-${expense.id}`}>
                                  <Receipt className="h-5 w-5 text-green-600" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground" data-testid={`no-receipt-${expense.id}`}>—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {expense.jobId ? (
                                <Link href={`/jobs/${expense.jobId}`}>
                                  <Button variant="link" size="sm" className="p-0">
                                    Job #{expense.jobId}
                                  </Button>
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Overhead</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(parseFloat(expense.amount))}
                            </TableCell>
                            <TableCell>
                              {expense.isDeductible ? (
                                <Badge className="bg-green-500">Yes</Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowAddDialog(true);
                                  }}
                                  data-testid={`button-edit-${expense.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(expense.id)}
                                  data-testid={`button-delete-${expense.id}`}
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
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4" />
                    <p>No expenses found</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => {
                        setSelectedExpense(null);
                        form.reset(defaultExpenseFormValues);
                        setShowAddDialog(true);
                      }}
                      data-testid="button-create-first"
                    >
                      Add your first expense
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Breakdown of spending by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryStats.map((stat) => (
                    <div key={stat.value} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <Tag className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{stat.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {expenses?.filter((e: Expense) => e.category === stat.value).length} entries
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{formatCurrency(stat.total)}</p>
                        <p className="text-sm text-muted-foreground">
                          {((stat.total / stats.total) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
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
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-amount"
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
                          <SelectTrigger data-testid="select-expense-category">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
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
                          data-testid="input-date"
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
                          <SelectTrigger data-testid="select-job">
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Job (Overhead)</SelectItem>
                          {jobs?.map((job: any) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.address} - {job.builderName}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter expense description..."
                        {...field}
                        data-testid="input-description"
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
                        data-testid="checkbox-deductible"
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
                  onClick={() => {
                    setShowAddDialog(false);
                    setSelectedExpense(null);
                    form.reset(defaultExpenseFormValues);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}