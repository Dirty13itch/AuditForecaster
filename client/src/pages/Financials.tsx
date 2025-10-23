import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, isWithinInterval } from "date-fns";
import {
  DollarSign,
  Plus,
  Download,
  Search,
  Filter,
  MapPin,
  Car,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Calendar as CalendarIcon,
  Briefcase,
  Trash2,
  Loader2,
  Receipt,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { AutoSaveIndicator } from "@/components/AutoSaveIndicator";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OfflineBanner } from "@/components/OfflineBanner";
import type { Expense, MileageLog, Job } from "@shared/schema";
import { insertExpenseSchema, insertMileageLogSchema } from "@shared/schema";
import { safeToFixed, safeParseFloat, safeDivide } from "@shared/numberUtils";

type DateRange = "week" | "month" | "year" | "custom";

const expenseFormSchema = insertExpenseSchema.extend({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a valid positive number"),
  category: z.enum(["Equipment", "Fuel", "Supplies", "Meals", "Other"]),
  date: z.date(),
});

const mileageFormSchema = insertMileageLogSchema.extend({
  distance: z.string().min(1, "Distance is required").refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Must be a valid positive number"),
  date: z.date(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type MileageFormValues = z.infer<typeof mileageFormSchema>;

export default function Financials() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customDateStart, setCustomDateStart] = useState<Date>();
  const [customDateEnd, setCustomDateEnd] = useState<Date>();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [mileageDialogOpen, setMileageDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [workFilter, setWorkFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMileageIndex, setCurrentMileageIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const { data: mileageLogs = [] } = useQuery<MileageLog[]>({ queryKey: ["/api/mileage-logs"] });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ["/api/jobs"] });

  const dateRangeInterval = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        return customDateStart && customDateEnd
          ? { start: customDateStart, end: customDateEnd }
          : { start: startOfMonth(now), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [dateRange, customDateStart, customDateEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const inDateRange = isWithinInterval(expenseDate, dateRangeInterval);
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      const matchesWork = workFilter === "all" || (workFilter === "work" ? expense.isWorkRelated : !expense.isWorkRelated);
      const matchesJob = jobFilter === "all" || expense.jobId === jobFilter;
      const matchesSearch = searchQuery === "" || expense.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return inDateRange && matchesCategory && matchesWork && matchesJob && matchesSearch;
    });
  }, [expenses, dateRangeInterval, categoryFilter, workFilter, jobFilter, searchQuery]);

  const filteredMileageLogs = useMemo(() => {
    return mileageLogs.filter((log) => {
      const logDate = new Date(log.date);
      return isWithinInterval(logDate, dateRangeInterval);
    });
  }, [mileageLogs, dateRangeInterval]);

  const unclassifiedMileage = useMemo(() => {
    return filteredMileageLogs.filter((log) => log.isWorkRelated === null);
  }, [filteredMileageLogs]);

  const summary = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);
    const workExpenses = filteredExpenses.filter((exp) => exp.isWorkRelated).reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);
    const personalExpenses = filteredExpenses.filter((exp) => !exp.isWorkRelated).reduce((sum, exp) => sum + safeParseFloat(exp.amount), 0);
    const totalMileage = filteredMileageLogs.reduce((sum, log) => sum + safeParseFloat(log.distance), 0);
    const workMileage = filteredMileageLogs.filter((log) => log.isWorkRelated).reduce((sum, log) => sum + safeParseFloat(log.distance), 0);
    const mileageDeduction = workMileage * 0.67;

    const categoryBreakdown = filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] ?? 0) + safeParseFloat(exp.amount);
      return acc;
    }, {} as Record<string, number>);

    return { totalExpenses, workExpenses, personalExpenses, totalMileage, workMileage, mileageDeduction, categoryBreakdown };
  }, [filteredExpenses, filteredMileageLogs]);

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const payload = {
        ...data,
        amount: data.amount.toString(),
        date: data.date.toISOString(),
      };
      return apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense added successfully" });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseFormValues> }) => {
      const payload = data.amount ? { ...data, amount: data.amount.toString() } : data;
      return apiRequest("PUT", `/api/expenses/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense updated successfully" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDeleteExpenseId(null);
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
  });

  const createMileageMutation = useMutation({
    mutationFn: async (data: MileageFormValues) => {
      const payload = {
        ...data,
        distance: data.distance.toString(),
        date: data.date.toISOString(),
      };
      return apiRequest("POST", "/api/mileage-logs", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage-logs"] });
      setMileageDialogOpen(false);
      toast({ title: "Success", description: "Mileage log added successfully" });
    },
  });

  const updateMileageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MileageFormValues> }) => {
      const payload = data.distance ? { ...data, distance: data.distance.toString() } : data;
      return apiRequest("PUT", `/api/mileage-logs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage-logs"] });
      toast({ title: "Success", description: "Mileage classification updated" });
    },
  });

  const handleSwipeGesture = (isWorkRelated: boolean) => {
    if (currentMileageIndex >= unclassifiedMileage.length) return;
    const log = unclassifiedMileage[currentMileageIndex];
    updateMileageMutation.mutate(
      { id: log.id, data: { isWorkRelated } },
      {
        onSuccess: () => {
          toast({
            title: isWorkRelated ? "Marked as Work" : "Marked as Personal",
            description: `${safeToFixed(safeParseFloat(log.distance), 1)} miles classified`,
            variant: isWorkRelated ? "default" : "default",
          });
          setCurrentMileageIndex(0);
          setSwipeOffset(0);
        },
      }
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setSwipeOffset(e.movementX + swipeOffset);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 150) {
      handleSwipeGesture(swipeOffset > 0);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = touch.clientX - rect.left - rect.width / 2;
    setSwipeOffset(offset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(swipeOffset) > 150) {
      handleSwipeGesture(swipeOffset > 0);
    } else {
      setSwipeOffset(0);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Category", "Amount", "Description", "Type", "Job"];
    const rows = filteredExpenses.map((exp) => [
      format(new Date(exp.date), "yyyy-MM-dd"),
      exp.category,
      `$${safeToFixed(safeParseFloat(exp.amount), 2)}`,
      exp.description ?? "",
      exp.isWorkRelated ? "Work" : "Personal",
      jobs.find((j) => j.id === exp.jobId)?.name || "N/A",
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <OfflineBanner />
      
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Financials
          </h1>
        </div>
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)} data-testid="tabs-date-range">
          <TabsList>
            <TabsTrigger value="week" data-testid="tab-week">This Week</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-month">This Month</TabsTrigger>
            <TabsTrigger value="year" data-testid="tab-year">This Year</TabsTrigger>
            <TabsTrigger value="custom" data-testid="tab-custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {dateRange === "custom" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="button-start-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateStart ? format(customDateStart, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={customDateStart} onSelect={setCustomDateStart} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="button-end-date">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateEnd ? format(customDateEnd, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={customDateEnd} onSelect={setCustomDateEnd} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card data-testid="card-total-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">
              ${safeToFixed(summary.totalExpenses, 2)}
            </div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} transactions</p>
          </CardContent>
        </Card>

        <Card data-testid="card-work-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Expenses</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="text-work-expenses">
              ${safeToFixed(summary.workExpenses, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Business deductible</p>
          </CardContent>
        </Card>

        <Card data-testid="card-personal-expenses">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-personal-expenses">
              ${safeToFixed(summary.personalExpenses, 2)}
            </div>
            <p className="text-xs text-muted-foreground">Non-deductible</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-mileage">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mileage</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-mileage">
              {safeToFixed(summary.totalMileage, 1)} mi
            </div>
            <p className="text-xs text-muted-foreground">{safeToFixed(summary.workMileage, 1)} mi work</p>
          </CardContent>
        </Card>

        <Card data-testid="card-mileage-deduction">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mileage Deduction</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success" data-testid="text-mileage-deduction">
              ${safeToFixed(summary.mileageDeduction, 2)}
            </div>
            <p className="text-xs text-muted-foreground">@$0.67/mile</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-expense-tracker">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Expense Tracker</CardTitle>
                <CardDescription>Manage your business and personal expenses</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }} data-testid="button-add-expense">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-expenses"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Fuel">Fuel</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Meals">Meals</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={workFilter} onValueChange={setWorkFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-work-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="work">Work Only</SelectItem>
                  <SelectItem value="personal">Personal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-expenses">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No expenses found</p>
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <Card key={expense.id} className="hover-elevate" data-testid={`card-expense-${expense.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={expense.isWorkRelated ? "default" : "secondary"} data-testid={`badge-expense-type-${expense.id}`}>
                              {expense.isWorkRelated ? "Work" : "Personal"}
                            </Badge>
                            <Badge variant="outline" data-testid={`badge-expense-category-${expense.id}`}>{expense.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1" data-testid={`text-expense-date-${expense.id}`}>
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                          <p className="text-sm" data-testid={`text-expense-description-${expense.id}`}>{expense.description ?? "No description"}</p>
                          {expense.jobId && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-expense-job-${expense.id}`}>
                              Job: {jobs.find((j) => j.id === expense.jobId)?.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold" data-testid={`text-expense-amount-${expense.id}`}>
                              ${safeToFixed(safeParseFloat(expense.amount), 2)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteExpenseId(expense.id)}
                            data-testid={`button-delete-expense-${expense.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-mileage-tracker">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Mileage Tracker</CardTitle>
                <CardDescription>Classify trips as work or personal</CardDescription>
              </div>
              <Button size="sm" onClick={() => setMileageDialogOpen(true)} data-testid="button-add-mileage">
                <Plus className="h-4 w-4 mr-2" />
                Add Trip
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {unclassifiedMileage.length > 0 ? (
              <>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {unclassifiedMileage.length} trip{unclassifiedMileage.length !== 1 ? "s" : ""} need classification
                  </p>
                  <p className="text-xs text-muted-foreground">Swipe right for work, left for personal</p>
                </div>

                <div
                  className="relative h-[300px] select-none touch-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  data-testid="mileage-swiper"
                >
                  <div
                    className="absolute inset-0 rounded-lg transition-transform duration-200 ease-out"
                    style={{
                      transform: `translateX(${swipeOffset}px) rotate(${swipeOffset / 20}deg)`,
                    }}
                  >
                    <Card className="h-full border-2 cursor-grab active:cursor-grabbing">
                      <CardContent className="p-6 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Badge variant="outline" data-testid="badge-unclassified">
                              Unclassified
                            </Badge>
                            <p className="text-sm text-muted-foreground" data-testid="text-trip-date">
                              {format(new Date(unclassifiedMileage[currentMileageIndex].date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Car className="h-5 w-5 text-primary" />
                              <div>
                                <p className="text-2xl font-bold" data-testid="text-trip-distance">
                                  {safeToFixed(safeParseFloat(unclassifiedMileage[currentMileageIndex].distance), 1)} miles
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Potential deduction: ${safeToFixed(safeParseFloat(unclassifiedMileage[currentMileageIndex].distance) * 0.67, 2)}
                                </p>
                              </div>
                            </div>
                            {unclassifiedMileage[currentMileageIndex].startLocation && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div className="text-sm">
                                  <p className="font-medium" data-testid="text-trip-start">From: {unclassifiedMileage[currentMileageIndex].startLocation}</p>
                                  {unclassifiedMileage[currentMileageIndex].endLocation && (
                                    <p className="text-muted-foreground mt-1" data-testid="text-trip-end">
                                      To: {unclassifiedMileage[currentMileageIndex].endLocation}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {unclassifiedMileage[currentMileageIndex].purpose && (
                              <p className="text-sm text-muted-foreground" data-testid="text-trip-purpose">
                                {unclassifiedMileage[currentMileageIndex].purpose}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSwipeGesture(false)}
                            disabled={updateMileageMutation.isPending}
                            data-testid="button-mark-personal"
                          >
                            {updateMileageMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Personal
                              </>
                            )}
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => handleSwipeGesture(true)}
                            disabled={updateMileageMutation.isPending}
                            data-testid="button-mark-work"
                          >
                            {updateMileageMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Work
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {Math.abs(swipeOffset) > 50 && (
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 text-4xl font-bold opacity-50 pointer-events-none",
                        swipeOffset > 0 ? "right-8 text-success" : "left-8 text-muted-foreground"
                      )}
                    >
                      {swipeOffset > 0 ? "WORK" : "PERSONAL"}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-unclassified">
                <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>All trips classified!</p>
                <p className="text-sm mt-2">Add new trips to track your mileage</p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Classified Trips</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {filteredMileageLogs
                  .filter((log) => log.isWorkRelated !== null)
                  .slice(0, 5)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2 rounded-lg border hover-elevate"
                      data-testid={`card-classified-mileage-${log.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={log.isWorkRelated ? "default" : "secondary"} className="shrink-0">
                            {log.isWorkRelated ? "Work" : "Personal"}
                          </Badge>
                          <p className="text-sm truncate">{safeToFixed(safeParseFloat(log.distance), 1)} mi</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(log.date), "MMM d")}</p>
                      </div>
                      {log.isWorkRelated && (
                        <p className="text-sm font-medium text-success">${safeToFixed(safeParseFloat(log.distance) * 0.67, 2)}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        expense={editingExpense}
        jobs={jobs}
        onSave={async (data) => {
          if (editingExpense) {
            await updateExpenseMutation.mutateAsync({ id: editingExpense.id, data });
          } else {
            await createExpenseMutation.mutateAsync(data);
          }
        }}
        isPending={createExpenseMutation.isPending || updateExpenseMutation.isPending}
      />

      <MileageDialog
        open={mileageDialogOpen}
        onOpenChange={setMileageDialogOpen}
        jobs={jobs}
        onSave={async (data) => {
          await createMileageMutation.mutateAsync(data);
        }}
        isPending={createMileageMutation.isPending}
      />

      <AlertDialog open={!!deleteExpenseId} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <AlertDialogContent data-testid="dialog-delete-expense">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteExpenseId && deleteExpenseMutation.mutate(deleteExpenseId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  jobs: Job[];
  onSave: (data: ExpenseFormValues) => Promise<void>;
  isPending: boolean;
}

function ExpenseDialog({ open, onOpenChange, expense, jobs, onSave, isPending }: ExpenseDialogProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: expense?.amount || "",
      category: (expense?.category as any) || "Equipment",
      description: expense?.description || "",
      date: expense?.date ? new Date(expense.date) : new Date(),
      jobId: expense?.jobId || undefined,
      isWorkRelated: expense?.isWorkRelated ?? true,
      receiptUrl: expense?.receiptUrl || undefined,
    },
  });

  const formData = form.watch();

  const autoSave = useAutoSave({
    data: formData,
    onSave: async () => {
      if (expense) {
        await onSave(formData);
      }
    },
    enabled: !!expense && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-expense">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            {expense && (
              <AutoSaveIndicator
                isSaving={autoSave.isSaving}
                lastSaved={autoSave.lastSaved}
                error={autoSave.error}
              />
            )}
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount *</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} data-testid="input-expense-amount" />
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
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-expense-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Supplies">Supplies</SelectItem>
                        <SelectItem value="Meals">Meals</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start" data-testid="button-expense-date">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                    </PopoverContent>
                  </Popover>
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
                    <Textarea placeholder="Enter expense details..." {...field} value={field.value ?? ""} data-testid="textarea-expense-description" />
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
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-job">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.name}
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
              name="isWorkRelated"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Work-Related Expense</FormLabel>
                    <p className="text-sm text-muted-foreground">Mark as business deductible</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-work-related" />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-expense">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-expense">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {expense ? "Update" : "Add"} Expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface MileageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  onSave: (data: MileageFormValues) => Promise<void>;
  isPending: boolean;
}

function MileageDialog({ open, onOpenChange, jobs, onSave, isPending }: MileageDialogProps) {
  const { toast } = useToast();
  const form = useForm<MileageFormValues>({
    resolver: zodResolver(mileageFormSchema),
    defaultValues: {
      distance: "",
      date: new Date(),
      startLocation: "",
      endLocation: "",
      purpose: "",
      isWorkRelated: true,
      jobId: undefined,
    },
  });

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast({ title: "Location captured", description: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}` });
        },
        () => {
          toast({ title: "Error", description: "Could not get location", variant: "destructive" });
        }
      );
    } else {
      toast({ title: "Not supported", description: "Geolocation not available", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-mileage">
        <DialogHeader>
          <DialogTitle>Add Mileage Log</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (miles) *</FormLabel>
                    <FormControl>
                      <Input placeholder="0.0" {...field} data-testid="input-mileage-distance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start" data-testid="button-mileage-date">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="startLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Location</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="e.g., Home Office" {...field} value={field.value ?? ""} data-testid="input-start-location" className="flex-1" />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={getCurrentLocation} data-testid="button-get-location">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Client Site" {...field} value={field.value ?? ""} data-testid="input-end-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Reason for trip..." {...field} value={field.value ?? ""} data-testid="textarea-mileage-purpose" />
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
                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-mileage-job">
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.name}
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
              name="isWorkRelated"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Work-Related Trip</FormLabel>
                    <p className="text-sm text-muted-foreground">Mark as business deductible</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-mileage-work" />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-mileage">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-mileage">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Trip
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
