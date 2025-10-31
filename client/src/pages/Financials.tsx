import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  FileText,
  CreditCard,
  Calendar,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  PieChart,
  BarChart3,
  Wallet,
  Clock,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { safeDivide, safeParseFloat } from "@shared/numberUtils";

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
const QUICK_LINKS = [
  {
    title: "Invoices",
    description: "Manage customer invoices",
    href: "/invoices",
    icon: FileText,
    color: "text-blue-600",
  },
  {
    title: "Payments",
    description: "Track received payments",
    href: "/payments",
    icon: CreditCard,
    color: "text-green-600",
  },
  {
    title: "Expenses",
    description: "Record business expenses",
    href: "/expenses",
    icon: Receipt,
    color: "text-orange-600",
  },
  {
    title: "AR Aging",
    description: "Accounts receivable aging",
    href: "/ar-aging",
    icon: Clock,
    color: "text-purple-600",
  },
  {
    title: "Analytics",
    description: "Financial analytics & reports",
    href: "/analytics",
    icon: BarChart3,
    color: "text-indigo-600",
  },
  {
    title: "Unbilled Work",
    description: "Track unbilled services",
    href: "/unbilled-work",
    icon: Wallet,
    color: "text-yellow-600",
  },
] as const;

// Phase 2 - BUILD: FinancialsContent wrapped in ErrorBoundary at export
function FinancialsContent() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [dateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  });

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  // Phase 6 - DOCUMENT: Fetch financial summary with revenue, expenses, profit metrics
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
  // Phase 6 - DOCUMENT: Fetch recent financial transactions for activity feed
  const {
    data: recentTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["/api/recent-financial-activity", { limit: 5 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5" });
      const response = await fetch(`/api/recent-financial-activity?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recent transactions");
      return response.json();
    },
    retry: 2,
  });

  // Phase 5 - HARDEN: Added retry: 2 and error handling
  // Phase 6 - DOCUMENT: Fetch revenue trend data for sparkline visualization
  const {
    data: revenueTrend,
    isLoading: trendLoading,
    error: trendError,
    refetch: refetchTrend,
  } = useQuery({
    queryKey: ["/api/revenue-by-period", period],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({ period: queryKey[1] as string });
      const response = await fetch(`/api/revenue-by-period?${params}`);
      if (!response.ok) throw new Error("Failed to fetch revenue trend");
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

  // Phase 6 - DOCUMENT: Net profit margin calculation
  // Formula: (Net Profit / Total Revenue) * 100
  // Phase 5 - HARDEN: Uses safeDivide to prevent division by zero
  // Phase 3 - OPTIMIZE: Memoized to avoid recalculation
  const profitMargin = useMemo(() => {
    const profit = summary?.netProfit || 0;
    const revenue = summary?.totalRevenue || 0;
    return safeDivide(profit, revenue, 0) * 100;
  }, [summary?.netProfit, summary?.totalRevenue]);

  // Phase 6 - DOCUMENT: Calculate revenue growth percentage
  // Formula: ((Current - Previous) / Previous) * 100
  // Phase 5 - HARDEN: Uses safeDivide to prevent division by zero
  // Phase 3 - OPTIMIZE: Memoized calculation
  const revenueGrowth = useMemo(() => {
    if (!revenueTrend || revenueTrend.length < 2) return 0;
    const current = safeParseFloat(revenueTrend[revenueTrend.length - 1]?.revenue);
    const previous = safeParseFloat(revenueTrend[revenueTrend.length - 2]?.revenue);
    return safeDivide(current - previous, previous, 0) * 100;
  }, [revenueTrend]);

  // Phase 3 - OPTIMIZE: useCallback prevents function recreation
  const handlePeriodChange = useCallback((value: "month" | "quarter" | "year") => {
    setPeriod(value);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for retry handlers
  const handleRetrySummary = useCallback(() => {
    refetchSummary();
  }, [refetchSummary]);

  const handleRetryTransactions = useCallback(() => {
    refetchTransactions();
  }, [refetchTransactions]);

  const handleRetryTrend = useCallback(() => {
    refetchTrend();
  }, [refetchTrend]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="page-financials">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Financial Overview
            </h1>
            <p className="text-muted-foreground" data-testid="text-page-description">
              Monitor your business financial health at a glance
            </p>
          </div>
          <div className="flex space-x-2">
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month" data-testid="option-period-month">Monthly</SelectItem>
                <SelectItem value="quarter" data-testid="option-period-quarter">Quarterly</SelectItem>
                <SelectItem value="year" data-testid="option-period-year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Link href="/financial-dashboard">
              <Button variant="outline" data-testid="button-detailed-dashboard">
                <PieChart className="h-4 w-4 mr-1" />
                Detailed Dashboard
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

        {/* Key Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue Card */}
          <Card data-testid="card-metric-revenue">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" data-testid="icon-revenue" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-revenue">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-revenue-amount">
                    {formatCurrency(summary?.totalRevenue || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {revenueGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1 text-green-500" data-testid="icon-revenue-up" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1 text-red-500" data-testid="icon-revenue-down" />
                    )}
                    <span data-testid="text-revenue-growth">
                      {revenueGrowth >= 0 ? '+' : ''}{Math.abs(revenueGrowth).toFixed(1)}% vs last {period}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Expenses Card */}
          <Card data-testid="card-metric-expenses">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" data-testid="icon-expenses" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-expenses">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-expenses-amount">
                    {formatCurrency(summary?.totalExpenses || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1" data-testid="text-expenses-note">
                    Including all categories
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Net Profit Card */}
          <Card data-testid="card-metric-profit">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" data-testid="icon-profit" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-profit">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      (summary?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                    data-testid="text-profit-amount"
                  >
                    {formatCurrency(summary?.netProfit || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1" data-testid="text-profit-margin">
                    {Math.abs(profitMargin).toFixed(1)}% profit margin
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Outstanding Invoices Card */}
          <Card data-testid="card-metric-outstanding">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Outstanding
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" data-testid="icon-outstanding" />
              </div>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-2" data-testid="skeleton-outstanding">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-outstanding-amount">
                    {formatCurrency(summary?.outstandingInvoices || 0)}
                  </div>
                  <div className="flex items-center text-xs mt-1">
                    {summary?.overdueInvoices > 0 ? (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" data-testid="icon-overdue" />
                        <span className="text-yellow-600" data-testid="text-overdue-amount">
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

        {/* Quick Access Links */}
        <div>
          <h2 className="text-lg font-semibold mb-4" data-testid="text-quick-links-title">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_LINKS.map((link, index) => (
              <Link key={link.href} href={link.href}>
                <Card
                  className="hover-elevate cursor-pointer transition-all"
                  data-testid={`card-quick-link-${index}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-muted`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} data-testid={`icon-quick-link-${index}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base" data-testid={`text-quick-link-title-${index}`}>
                          {link.title}
                        </CardTitle>
                        <CardDescription className="text-xs" data-testid={`text-quick-link-desc-${index}`}>
                          {link.description}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" data-testid={`icon-arrow-${index}`} />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Financial Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <Card data-testid="card-recent-activity">
            <CardHeader>
              <CardTitle data-testid="text-activity-title">Recent Activity</CardTitle>
              <CardDescription data-testid="text-activity-description">
                Latest financial transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phase 2 - BUILD: Error state with retry for transactions */}
              {transactionsError ? (
                <Alert variant="destructive" data-testid="alert-transactions-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Transactions</AlertTitle>
                  <AlertDescription className="flex items-center justify-between">
                    <span>{transactionsError.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryTransactions}
                      data-testid="button-retry-transactions"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : transactionsLoading ? (
                /* Phase 2 - BUILD: Skeleton for transactions */
                <div className="space-y-3" data-testid="skeleton-transactions">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((transaction: any, index: number) => (
                    <div
                      key={transaction.id || index}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      data-testid={`transaction-item-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {transaction.type === "invoice" ? (
                            <FileText className="h-4 w-4 text-blue-600" data-testid={`icon-transaction-${index}`} />
                          ) : transaction.type === "payment" ? (
                            <CreditCard className="h-4 w-4 text-green-600" data-testid={`icon-transaction-${index}`} />
                          ) : (
                            <Receipt className="h-4 w-4 text-orange-600" data-testid={`icon-transaction-${index}`} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm" data-testid={`text-transaction-desc-${index}`}>
                            {transaction.description}
                          </div>
                          <div className="text-xs text-muted-foreground" data-testid={`text-transaction-date-${index}`}>
                            {transaction.date ? format(new Date(transaction.date), "MMM d, yyyy") : "N/A"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-semibold ${
                          transaction.type === "payment" ? "text-green-600" : "text-foreground"
                        }`}
                        data-testid={`text-transaction-amount-${index}`}
                      >
                        {transaction.type === "payment" ? "+" : ""}
                        {formatCurrency(safeParseFloat(transaction.amount))}
                      </div>
                    </div>
                  ))}
                  <Link href="/analytics">
                    <Button
                      variant="ghost"
                      className="w-full"
                      data-testid="button-view-all-transactions"
                    >
                      View All Transactions
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              ) : (
                /* Phase 2 - BUILD: Empty state for transactions */
                <div
                  className="h-48 flex flex-col items-center justify-center text-muted-foreground"
                  data-testid="empty-transactions"
                >
                  <Calendar className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No recent financial activity</p>
                  <p className="text-xs mt-1">Transactions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Health Summary */}
          <Card data-testid="card-financial-health">
            <CardHeader>
              <CardTitle data-testid="text-health-title">Financial Health</CardTitle>
              <CardDescription data-testid="text-health-description">
                Key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-4" data-testid="skeleton-health">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Profit Margin Indicator */}
                  <div data-testid="indicator-profit-margin">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" data-testid="text-indicator-profit-label">
                        Profit Margin
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          profitMargin >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                        data-testid="text-indicator-profit-value"
                      >
                        {Math.abs(profitMargin).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          profitMargin >= 20 ? "bg-green-500" : profitMargin >= 10 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(Math.max(profitMargin, 0), 100)}%` }}
                        data-testid="bar-profit-margin"
                      />
                    </div>
                  </div>

                  {/* Collection Ratio */}
                  <div data-testid="indicator-collection-ratio">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" data-testid="text-indicator-collection-label">
                        Collection Ratio
                      </span>
                      <span className="text-sm font-semibold" data-testid="text-indicator-collection-value">
                        {summary?.collectionRatio ? `${summary.collectionRatio.toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(summary?.collectionRatio || 0, 100)}%` }}
                        data-testid="bar-collection-ratio"
                      />
                    </div>
                  </div>

                  {/* Outstanding to Revenue Ratio */}
                  <div data-testid="indicator-outstanding-ratio">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" data-testid="text-indicator-outstanding-label">
                        Outstanding vs Revenue
                      </span>
                      <span className="text-sm font-semibold" data-testid="text-indicator-outstanding-value">
                        {summary?.outstandingRatio ? `${summary.outstandingRatio.toFixed(1)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (summary?.outstandingRatio || 0) < 20 ? "bg-green-500" : (summary?.outstandingRatio || 0) < 40 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(summary?.outstandingRatio || 0, 100)}%` }}
                        data-testid="bar-outstanding-ratio"
                      />
                    </div>
                  </div>

                  {/* Average Days to Payment */}
                  <div data-testid="indicator-avg-days">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" data-testid="text-indicator-days-label">
                        Avg. Days to Payment
                      </span>
                      <span className="text-sm font-semibold" data-testid="text-indicator-days-value">
                        {summary?.averageDaysToPayment || 0} days
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (summary?.averageDaysToPayment || 0) <= 30 ? "bg-green-500" : (summary?.averageDaysToPayment || 0) <= 60 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min((summary?.averageDaysToPayment || 0) / 90 * 100, 100)}%` }}
                        data-testid="bar-avg-days"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Wrap entire page in ErrorBoundary with comprehensive fallback
export default function Financials() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-6 max-w-7xl" data-testid="error-boundary-fallback">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Page Error</AlertTitle>
            <AlertDescription>
              <p className="mb-3">
                The financial overview page encountered an error. Please try refreshing the page.
              </p>
              <Button
                variant="outline"
                size="sm"
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
      <FinancialsContent />
    </ErrorBoundary>
  );
}
