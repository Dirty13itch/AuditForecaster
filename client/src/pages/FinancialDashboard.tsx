import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  });

  // Fetch financial summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
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
  });

  // Fetch revenue by period
  const { data: revenueData } = useQuery({
    queryKey: ["/api/revenue-by-period", period],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({ period: queryKey[1] as string });
      const response = await fetch(`/api/revenue-by-period?${params}`);
      if (!response.ok) throw new Error("Failed to fetch revenue data");
      return response.json();
    },
  });

  // Fetch expenses by category
  const { data: expenseCategories } = useQuery({
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
  });

  // Fetch recent invoices
  const { data: recentInvoices } = useQuery({
    queryKey: ["/api/invoices", { limit: 5 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "5" });
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recent invoices");
      return response.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Prepare chart data
  const chartData = revenueData?.map((item: any) => ({
    period: item.period,
    revenue: parseFloat(item.revenue),
    count: item.count,
  })) || [];

  const pieData = expenseCategories?.map((cat: any) => ({
    name: cat.category || "Other",
    value: parseFloat(cat.total),
  })) || [];

  const COLORS = ["#2E5BBA", "#28A745", "#FFC107", "#DC3545", "#17A2B8", "#FD7E14"];

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
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
            <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
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
                    <span>
                      {Math.abs(
                        ((summary?.netProfit || 0) / (summary?.totalRevenue || 1)) * 100
                      ).toFixed(1)}
                      % margin
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="text-outstanding">
                    {formatCurrency(summary?.outstandingInvoices || 0)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {summary?.overdueInvoices > 0 && (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1 text-yellow-500" />
                        <span className="text-yellow-600">
                          {formatCurrency(summary?.overdueInvoices)} overdue
                        </span>
                      </>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
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
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Latest invoice activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices?.items?.map((invoice: any) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`invoice-item-${invoice.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "overdue"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(parseFloat(invoice.total))}</div>
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm" className="mt-1">
                          View
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent invoices
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common financial tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/invoices/new">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-create-invoice">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
                <Link href="/expenses/new">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-log-expense">
                    <Receipt className="h-4 w-4 mr-2" />
                    Log Expense
                  </Button>
                </Link>
                <Link href="/mileage/new">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-log-mileage">
                    <Car className="h-4 w-4 mr-2" />
                    Log Mileage
                  </Button>
                </Link>
                <Link href="/financial-reports">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-reports">
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Mileage Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Miles:</span>
                    <span className="font-medium">
                      {formatNumber(summary?.totalMileage || 0)} miles
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deduction:</span>
                    <span className="font-medium">
                      {formatCurrency(summary?.mileageDeduction || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IRS Rate:</span>
                    <span className="font-medium">$0.67/mile</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}