import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { trackPageView } from '@/lib/analytics/events';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Car,
  FileText,
  Plus,
  ArrowRight,
  Calendar,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { safeDivide, safeParseFloat } from "@shared/numberUtils";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Chart colors matching design system
const CHART_COLORS = [
  "#2E5BBA", // Primary Blue
  "#28A745", // Success Green
  "#FFC107", // Warning Yellow
  "#DC3545", // Error Red
  "#17A2B8", // Info Blue
  "#FD7E14", // Orange
] as const;

// IRS standard mileage rate for 2025
const IRS_MILEAGE_RATE = 0.67;

// Phase 2 - BUILD: FinancialDashboardContent wrapped in ErrorBoundary at export
function FinancialDashboardContent() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  });

  // Track page view analytics
  useEffect(() => {
    trackPageView('Financial Dashboard');
  }, []);

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  // Fetch financial summary with revenue, expenses, profit metrics
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: [
      "/api/financial-summary",
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({
        startDate: queryKey[1] as string,
        endDate: queryKey[2] as string,
      });
      const response = await fetch(`/api/financial-summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch financial summary");
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Added retry: 2 and error handling
  // Fetch revenue trend data by selected period (month/quarter/year)
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useQuery({
    queryKey: ["/api/revenue-by-period", period],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({ period: queryKey[1] as string });
      const response = await fetch(`/api/revenue-by-period?${params}`);
      if (!response.ok) throw new Error("Failed to fetch revenue data");
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Added retry: 2 and error handling
  // Fetch expense breakdown by category for pie chart visualization
  const {
    data: expenseCategories,
    isLoading: expensesLoading,
    error: expensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: [
      "/api/expenses-by-category",
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({
        startDate: queryKey[1] as string,
        endDate: queryKey[2] as string,
      });
      const response = await fetch(`/api/expenses-by-category?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expense categories");
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Added retry: 2 and error handling
  // Fetch recent invoices for activity feed
  const {
    data: recentInvoices,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["/api/invoices", { limit: 5 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5" });
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recent invoices");
      return response.json();
    },
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoized currency formatter to prevent recreation
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }, []);

  // Phase 3 - OPTIMIZE: Memoized number formatter
  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  }, []);

  // Phase 6 - DOCUMENT: Revenue trend chart data
  // Transforms API response into chart-ready format with parsed numeric values
  // Phase 3 - OPTIMIZE: Memoized to prevent recomputation on every render
  const chartData = useMemo(() => {
    return revenueData?.map((item: any) => ({
      period: item.period,
      revenue: safeParseFloat(item.revenue),
      count: item.count,
    })) || [];
  }, [revenueData]);

  // Phase 6 - DOCUMENT: Expense category pie chart data
  // Aggregates expense totals by category for visualization
  // Phase 3 - OPTIMIZE: Memoized to prevent recomputation
  const pieData = useMemo(() => {
    return expenseCategories?.map((cat: any) => ({
      name: cat.category || "Other",
      value: safeParseFloat(cat.total),
    })) || [];
  }, [expenseCategories]);

  // Phase 6 - DOCUMENT: Net profit margin calculation
  // Formula: (Net Profit / Total Revenue) * 100
  // Phase 5 - HARDEN: Uses safeDivide to prevent division by zero
  // Phase 3 - OPTIMIZE: Memoized to avoid recalculation
  const profitMargin = useMemo(() => {
    const profit = summary?.netProfit || 0;
    const revenue = summary?.totalRevenue || 0;
    return safeDivide(profit, revenue, 0) * 100;
  }, [summary?.netProfit, summary?.totalRevenue]);

  // Phase 6 - DOCUMENT: Mileage tax deduction calculation
  // Formula: Total Miles * IRS Rate ($0.67/mile for 2025)
  // Phase 3 - OPTIMIZE: Memoized calculation
  const mileageDeduction = useMemo(() => {
    const miles = summary?.totalMileage || 0;
    return miles * IRS_MILEAGE_RATE;
  }, [summary?.totalMileage]);

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation
  const handlePeriodChange = useCallback((value: "month" | "quarter" | "year") => {
    setPeriod(value);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetrySummary = useCallback(() => {
    refetchSummary();
  }, [refetchSummary]);

  const handleRetryRevenue = useCallback(() => {
    refetchRevenue();
  }, [refetchRevenue]);

  const handleRetryExpenses = useCallback(() => {
    refetchExpenses();
  }, [refetchExpenses]);

  const handleRetryInvoices = useCallback(() => {
    refetchInvoices();
  }, [refetchInvoices]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="page-financial-dashboard">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">
              Financial Dashboard
            </h1>
            <p className="text-muted-foreground">
              Track revenue, expenses, and profitability
            </p>
          </div>
          <div className="flex space-x-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/invoices">
              <Button data-testid="button-new-invoice">
                <Plus className="h-4 w-4 mr-1" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Phase 2 - BUILD: Per-query error state with retry for financial summary */}
        {summaryError && (
          <Alert variant="destructive" data-testid="alert-summary-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Financial Summary</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{summaryError.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetrySummary}
                data-testid="button-retry-summary"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue Card */}
          <Card data-testid="card-total-revenue">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-total-revenue">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    {formatCurrency(summary?.totalRevenue || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    <span>This {period}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Expenses Card */}
          <Card data-testid="card-total-expenses">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-total-expenses">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-total-expenses">
                    {formatCurrency(summary?.totalExpenses || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Receipt className="h-3 w-3 mr-1" />
                    <span>Including mileage</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card data-testid="card-net-profit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-net-profit">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      (summary?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                    data-testid="text-net-profit"
                  >
                    {formatCurrency(summary?.netProfit || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {(summary?.netProfit || 0) >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                    )}
                    <span data-testid="text-profit-margin">
                      {Math.abs(profitMargin).toFixed(1)}% margin
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Outstanding Invoices Card */}
          <Card data-testid="card-outstanding">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-outstanding">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-outstanding">
                    {formatCurrency(summary?.outstandingInvoices || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {summary?.overdueInvoices > 0 ? (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                        <span className="text-yellow-600" data-testid="text-overdue">
                          {formatCurrency(summary?.overdueInvoices)} overdue
                        </span>
                      </>
                    ) : (
                      <span className="text-green-600" data-testid="text-no-overdue">
                        All current
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card data-testid="card-revenue-trend">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Revenue over time by {period}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phase 2 - BUILD: Error state with retry for revenue chart */}
              {revenueError ? (
                <Alert variant="destructive" data-testid="alert-revenue-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Revenue Data</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{revenueError.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryRevenue}
                      data-testid="button-retry-revenue"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : revenueLoading ? (
                /* Phase 2 - BUILD: Skeleton for revenue chart */
                <div className="space-y-2" data-testid="skeleton-revenue-chart">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2E5BBA"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                /* Phase 2 - BUILD: Empty state for revenue chart */
                <div
                  className="h-[250px] flex flex-col items-center justify-center text-muted-foreground"
                  data-testid="empty-revenue-chart"
                >
                  <TrendingUp className="h-12 w-12 mb-2 opacity-50" />
                  <p>No revenue data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown Chart */}
          <Card data-testid="card-expense-breakdown">
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phase 2 - BUILD: Error state with retry for expenses chart */}
              {expensesError ? (
                <Alert variant="destructive" data-testid="alert-expenses-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Expense Data</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{expensesError.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryExpenses}
                      data-testid="button-retry-expenses"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : expensesLoading ? (
                /* Phase 2 - BUILD: Skeleton for expenses chart */
                <div className="space-y-2" data-testid="skeleton-expense-chart">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                /* Phase 2 - BUILD: Empty state for expenses chart */
                <div
                  className="h-[250px] flex flex-col items-center justify-center text-muted-foreground"
                  data-testid="empty-expense-chart"
                >
                  <Receipt className="h-12 w-12 mb-2 opacity-50" />
                  <p>No expense data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card data-testid="card-recent-invoices">
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest invoice activity</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phase 2 - BUILD: Error state with retry for invoices */}
              {invoicesError ? (
                <Alert variant="destructive" data-testid="alert-invoices-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Invoices</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{invoicesError.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryInvoices}
                      data-testid="button-retry-invoices"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : invoicesLoading ? (
                /* Phase 2 - BUILD: Skeleton for recent invoices */
                <div className="space-y-3" data-testid="skeleton-recent-invoices">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : recentInvoices?.items && recentInvoices.items.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.items.map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      data-testid={`invoice-item-${invoice.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium" data-testid={`invoice-number-${invoice.id}`}>
                            {invoice.invoiceNumber}
                          </span>
                          <Badge
                            variant={
                              invoice.status === "paid"
                                ? "default"
                                : invoice.status === "overdue"
                                ? "destructive"
                                : "secondary"
                            }
                            data-testid={`invoice-status-${invoice.id}`}
                          >
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold" data-testid={`invoice-total-${invoice.id}`}>
                          {formatCurrency(safeParseFloat(invoice.total))}
                        </div>
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1"
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            View
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Phase 2 - BUILD: Empty state for recent invoices */
                <div
                  className="text-center py-8 flex flex-col items-center justify-center text-muted-foreground"
                  data-testid="empty-recent-invoices"
                >
                  <FileText className="h-12 w-12 mb-2 opacity-50" />
                  <p>No recent invoices</p>
                  <Link href="/invoices/new">
                    <Button variant="outline" className="mt-3" data-testid="button-create-first-invoice">
                      <Plus className="h-4 w-4 mr-1" />
                      Create Your First Invoice
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card data-testid="card-quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common financial tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/invoices/new">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-create-invoice"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
                <Link href="/expenses/new">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-log-expense"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Log Expense
                  </Button>
                </Link>
                <Link href="/mileage/new">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-log-mileage"
                  >
                    <Car className="h-4 w-4 mr-2" />
                    Log Mileage
                  </Button>
                </Link>
                <Link href="/financial-reports">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-view-reports"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </div>

              {/* Mileage Summary Widget */}
              <div className="mt-6 p-4 bg-muted rounded-lg" data-testid="widget-mileage-summary">
                <h4 className="font-medium mb-2">Mileage Summary</h4>
                {summaryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Miles:</span>
                      <span className="font-medium" data-testid="text-total-mileage">
                        {formatNumber(summary?.totalMileage || 0)} miles
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deduction:</span>
                      <span className="font-medium" data-testid="text-mileage-deduction">
                        {formatCurrency(mileageDeduction)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IRS Rate:</span>
                      <span className="font-medium" data-testid="text-irs-rate">
                        ${IRS_MILEAGE_RATE.toFixed(2)}/mile
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Export with ErrorBoundary wrapper for production resilience
export default function FinancialDashboard() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Alert variant="destructive" data-testid="alert-error-boundary">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Financial Dashboard</AlertTitle>
            <AlertDescription>
              An unexpected error occurred. Please try refreshing the page.
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reload Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      <FinancialDashboardContent />
    </ErrorBoundary>
  );
}
