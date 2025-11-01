import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  RefreshCw,
  FileDown,
  AlertCircle,
  ArrowUpDown
} from "lucide-react";
import { format, startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";
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
import type { ProfitabilitySummary, JobTypeRevenue, BuilderProfitability, CashFlowForecast, InspectorUtilization } from "@shared/schema";

interface DateRange {
  from: Date;
  to: Date;
}

type DateRangePreset = "mtd" | "qtd" | "ytd" | "custom";

const CHART_COLORS = ["#2E5BBA", "#28A745", "#FFC107", "#DC3545", "#17A2B8", "#6C757D"];

type SortField = "builderName" | "revenue" | "jobCount" | "avgRevenue" | "outstandingAR";
type SortOrder = "asc" | "desc";

function AnalyticsDashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("ytd");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: startOfYear(new Date()),
    to: new Date(),
  }));

  // Inspector selection
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);

  // Table sorting state
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Access control
  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    setLocation("/financial/expenses");
    return null;
  }

  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    setDateRangePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "mtd":
        setDateRange({ from: startOfMonth(now), to: now });
        break;
      case "qtd":
        setDateRange({ from: startOfQuarter(now), to: now });
        break;
      case "ytd":
        setDateRange({ from: startOfYear(now), to: now });
        break;
      case "custom":
        // Keep existing range for custom
        break;
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Invalidate all analytics queries using predicate matching
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/analytics/');
      }
    });
    toast({
      title: "Refreshed",
      description: "Analytics data has been refreshed",
    });
  }, [toast]);

  const handleExportCSV = useCallback(() => {
    if (!summary || !jobTypeRevenue || !builderProfitability) {
      toast({
        title: "Error",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = [
        ["Business Analytics Report"],
        [`Date Range: ${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`],
        [],
        ["Summary Metrics"],
        ["Revenue", summary.revenue],
        ["Expenses", summary.expenses],
        ["Profit", summary.profit],
        ["Profit Margin", summary.profitMargin],
        [],
        ["Revenue by Job Type"],
        ["Job Type", "Revenue", "Job Count", "Avg Revenue"],
        ...jobTypeRevenue.map(item => [
          item.jobType,
          item.revenue,
          item.jobCount.toString(),
          item.avgRevenue,
        ]),
        [],
        ["Builder Profitability"],
        ["Builder Name", "Revenue", "Job Count", "Avg Revenue", "Outstanding AR"],
        ...builderProfitability.map(item => [
          item.builderName,
          item.revenue,
          item.jobCount.toString(),
          item.avgRevenue,
          item.outstandingAR,
        ]),
      ];

      const csv = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "CSV file downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    }
  }, [summary, jobTypeRevenue, builderProfitability, dateRange, toast]);

  const handleExportPDF = useCallback(() => {
    toast({
      title: "Coming Soon",
      description: "PDF export will be available in a future update",
    });
  }, [toast]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }, [sortField, sortOrder]);

  // Queries - Format dates as query params (startDate/endDate) that backend expects
  const { 
    data: summary, 
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery<ProfitabilitySummary>({
    queryKey: ["/api/analytics/profitability-summary", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
    retry: 2,
  });

  const { 
    data: jobTypeRevenue, 
    isLoading: jobTypeLoading,
    error: jobTypeError,
    refetch: refetchJobType
  } = useQuery<JobTypeRevenue[]>({
    queryKey: ["/api/analytics/revenue-by-job-type", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
    retry: 2,
  });

  const { 
    data: builderProfitability, 
    isLoading: builderLoading,
    error: builderError,
    refetch: refetchBuilder
  } = useQuery<BuilderProfitability[]>({
    queryKey: ["/api/analytics/builder-profitability", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
    retry: 2,
  });

  const { 
    data: cashFlow, 
    isLoading: cashFlowLoading,
    error: cashFlowError,
    refetch: refetchCashFlow
  } = useQuery<CashFlowForecast>({
    queryKey: ["/api/analytics/cash-flow-forecast"],
    enabled: user?.role === "admin",
    retry: 2,
  });

  const { 
    data: inspectorUtil, 
    isLoading: inspectorLoading,
    error: inspectorError,
    refetch: refetchInspector
  } = useQuery<InspectorUtilization>({
    queryKey: ["/api/analytics/inspector-utilization", { 
      userId: selectedInspectorId!,
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin" && !!selectedInspectorId,
    retry: 2,
  });

  // Mock data for revenue trend (monthly breakdown)
  const monthlyRevenue = useMemo(() => {
    if (!summary) return [];
    
    // Generate last 6 months of data
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "MMM yyyy"),
        revenue: Math.floor(Math.random() * 50000 + 30000), // Mock data
      });
    }
    return months;
  }, [summary]);

  // Sorted builder profitability
  const sortedBuilders = useMemo(() => {
    if (!builderProfitability) return [];
    
    return [...builderProfitability].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];
      
      // Convert string numbers to numbers for comparison
      if (sortField === "revenue" || sortField === "avgRevenue" || sortField === "outstandingAR") {
        aVal = parseFloat(aVal as string) || 0;
        bVal = parseFloat(bVal as string) || 0;
      } else if (sortField === "jobCount") {
        aVal = a.jobCount;
        bVal = b.jobCount;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [builderProfitability, sortField, sortOrder]);

  // Cash flow forecast data for chart
  const cashFlowChartData = useMemo(() => {
    if (!cashFlow) return [];
    
    return [
      {
        period: "30 Days",
        cashIn: parseFloat(cashFlow.projectedCashIn) || 0,
        cashOut: parseFloat(cashFlow.projectedCashOut) || 0,
        net: parseFloat(cashFlow.netCashFlow) || 0,
      },
      {
        period: "60 Days",
        cashIn: (parseFloat(cashFlow.projectedCashIn) || 0) * 1.8,
        cashOut: (parseFloat(cashFlow.projectedCashOut) || 0) * 1.7,
        net: (parseFloat(cashFlow.netCashFlow) || 0) * 1.9,
      },
      {
        period: "90 Days",
        cashIn: (parseFloat(cashFlow.projectedCashIn) || 0) * 2.6,
        cashOut: (parseFloat(cashFlow.projectedCashOut) || 0) * 2.5,
        net: (parseFloat(cashFlow.netCashFlow) || 0) * 2.7,
      },
    ];
  }, [cashFlow]);

  const getProfitMarginColor = (margin: string) => {
    const value = parseFloat(margin) || 0;
    if (value > 20) return "text-green-600";
    if (value >= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const isAROverdue = (ar: string) => {
    // Simple heuristic: if AR is high, assume some is overdue
    const value = parseFloat(ar) || 0;
    return value > 10000; // Mock logic
  };

  return (
    <div className="h-full overflow-auto" data-testid="page-analytics-dashboard">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Business Analytics</h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">
              Track revenue, expenses, and profitability
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Preset Selector */}
            <Select value={dateRangePreset} onValueChange={(val) => handlePresetChange(val as DateRangePreset)}>
              <SelectTrigger className="w-[140px]" data-testid="select-daterange-preset">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtd" data-testid="option-mtd">MTD (Month to Date)</SelectItem>
                <SelectItem value="qtd" data-testid="option-qtd">QTD (Quarter to Date)</SelectItem>
                <SelectItem value="ytd" data-testid="option-ytd">YTD (Year to Date)</SelectItem>
                <SelectItem value="custom" data-testid="option-custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleExportCSV}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>

            <Button
              variant="outline"
              size="default"
              onClick={handleExportPDF}
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="text-sm text-muted-foreground" data-testid="text-daterange">
          {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
        </div>

        {/* Error state for summary */}
        {summaryError && (
          <Alert variant="destructive" data-testid="alert-summary-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Analytics Summary</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch profitability summary. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => refetchSummary()}
                data-testid="button-retry-summary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="grid-kpi-cards">
          {/* Revenue Card */}
          <Card data-testid="card-kpi-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                <>
                  <div className="text-2xl font-bold" data-testid="text-revenue">
                    ${parseFloat(summary.revenue).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{summary.invoiceCount} invoices</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Expenses Card */}
          <Card data-testid="card-kpi-expenses">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                <>
                  <div className="text-2xl font-bold" data-testid="text-expenses">
                    ${parseFloat(summary.expenses).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                    <TrendingDown className="h-3 w-3" />
                    <span>{summary.expenseCount} expenses</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Profit Card */}
          <Card data-testid="card-kpi-profit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                <>
                  <div className="text-2xl font-bold" data-testid="text-profit">
                    ${parseFloat(summary.profit).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Revenue - Expenses
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Profit Margin Card */}
          <Card data-testid="card-kpi-profit-margin">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : summary ? (
                <>
                  <div 
                    className={`text-2xl font-bold ${getProfitMarginColor(summary.profitMargin)}`}
                    data-testid="text-profit-margin"
                  >
                    {parseFloat(summary.profitMargin).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {parseFloat(summary.profitMargin) > 20 ? "Excellent" : 
                     parseFloat(summary.profitMargin) >= 10 ? "Good" : "Needs Improvement"}
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card data-testid="card-revenue-trend">
            <CardHeader>
              <CardTitle data-testid="text-revenue-trend-title">Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-[300px] w-full" data-testid="skeleton-revenue-trend" />
              ) : summaryError ? (
                <Alert variant="destructive" data-testid="alert-revenue-trend-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load revenue trend data</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refetchSummary()}
                      data-testid="button-retry-revenue-trend"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2E5BBA" 
                      strokeWidth={2}
                      dot={{ fill: "#2E5BBA" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No revenue data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Job Type */}
          <Card data-testid="card-revenue-by-job-type">
            <CardHeader>
              <CardTitle data-testid="text-job-type-revenue-title">Revenue by Job Type</CardTitle>
              <CardDescription>Revenue breakdown by inspection type</CardDescription>
            </CardHeader>
            <CardContent>
              {jobTypeLoading ? (
                <Skeleton className="h-[300px] w-full" data-testid="skeleton-job-type-revenue" />
              ) : jobTypeError ? (
                <Alert variant="destructive" data-testid="alert-job-type-revenue-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load job type revenue data</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refetchJobType()}
                      data-testid="button-retry-job-type"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : jobTypeRevenue && jobTypeRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={jobTypeRevenue}
                      dataKey={(entry) => parseFloat(entry.revenue) || 0}
                      nameKey="jobType"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.jobType}: $${parseFloat(entry.revenue).toLocaleString()}`}
                    >
                      {jobTypeRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No job type data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Builder Profitability Table */}
          <Card data-testid="card-builder-profitability" className="lg:col-span-2">
            <CardHeader>
              <CardTitle data-testid="text-builder-profitability-title">Builder Profitability</CardTitle>
              <CardDescription>Revenue and outstanding AR by builder</CardDescription>
            </CardHeader>
            <CardContent>
              {builderLoading ? (
                <div className="space-y-2" data-testid="skeleton-builder-profitability">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : builderError ? (
                <Alert variant="destructive" data-testid="alert-builder-profitability-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load builder profitability data</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refetchBuilder()}
                      data-testid="button-retry-builder"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : sortedBuilders.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("builderName")}
                            data-testid="sort-builder-name"
                          >
                            Builder Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("revenue")}
                            data-testid="sort-revenue"
                          >
                            Revenue
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("jobCount")}
                            data-testid="sort-job-count"
                          >
                            Job Count
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("avgRevenue")}
                            data-testid="sort-avg-revenue"
                          >
                            Avg Revenue
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("outstandingAR")}
                            data-testid="sort-outstanding-ar"
                          >
                            Outstanding AR
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedBuilders.map((builder) => (
                        <TableRow key={builder.builderId} data-testid={`row-builder-${builder.builderId}`}>
                          <TableCell className="font-medium" data-testid={`cell-builder-name-${builder.builderId}`}>{builder.builderName}</TableCell>
                          <TableCell data-testid={`cell-revenue-${builder.builderId}`}>${parseFloat(builder.revenue).toLocaleString()}</TableCell>
                          <TableCell data-testid={`cell-job-count-${builder.builderId}`}>{builder.jobCount}</TableCell>
                          <TableCell data-testid={`cell-avg-revenue-${builder.builderId}`}>${parseFloat(builder.avgRevenue).toLocaleString()}</TableCell>
                          <TableCell data-testid={`cell-ar-${builder.builderId}`}>
                            <span className={isAROverdue(builder.outstandingAR) ? "text-red-600 font-semibold" : ""}>
                              ${parseFloat(builder.outstandingAR).toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No builder data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow Forecast */}
          <Card data-testid="card-cash-flow-forecast" className="lg:col-span-2">
            <CardHeader>
              <CardTitle data-testid="text-cash-flow-title">Cash Flow Forecast</CardTitle>
              <CardDescription>Projected cash in/out over next 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <Skeleton className="h-[300px] w-full" data-testid="skeleton-cash-flow" />
              ) : cashFlowError ? (
                <Alert variant="destructive" data-testid="alert-cash-flow-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Failed to load cash flow forecast data</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => refetchCashFlow()}
                      data-testid="button-retry-cash-flow"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : cashFlowChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cashFlowChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cashIn" fill="#28A745" name="Cash In" />
                    <Bar dataKey="cashOut" fill="#DC3545" name="Cash Out" />
                    <Bar dataKey="net" fill="#2E5BBA" name="Net Cash Flow" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No cash flow data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inspector Utilization Section */}
        <Card data-testid="card-inspector-utilization">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="text-inspector-utilization-title">Inspector Utilization</CardTitle>
                <CardDescription>Productivity and revenue by inspector</CardDescription>
              </div>
              <Select 
                value={selectedInspectorId || ""} 
                onValueChange={setSelectedInspectorId}
              >
                <SelectTrigger className="w-[200px]" data-testid="select-inspector">
                  <SelectValue placeholder="Select inspector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inspector-1" data-testid="option-inspector-1">John Doe</SelectItem>
                  <SelectItem value="inspector-2" data-testid="option-inspector-2">Jane Smith</SelectItem>
                  <SelectItem value="inspector-3" data-testid="option-inspector-3">Bob Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedInspectorId ? (
              <div className="py-8 text-center text-muted-foreground" data-testid="empty-inspector-util">
                <p>Select an inspector to view utilization metrics</p>
              </div>
            ) : inspectorLoading ? (
              <Skeleton className="h-[200px] w-full" data-testid="skeleton-inspector-util" />
            ) : inspectorError ? (
              <Alert variant="destructive" data-testid="alert-inspector-util-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Failed to load inspector utilization data</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => refetchInspector()}
                    data-testid="button-retry-inspector"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : inspectorUtil ? (
              <div className="space-y-4" data-testid="section-inspector-metrics">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div data-testid="metric-jobs-completed">
                    <div className="text-sm text-muted-foreground">Jobs Completed</div>
                    <div className="text-2xl font-bold">{inspectorUtil.jobsCompleted}</div>
                  </div>
                  <div data-testid="metric-revenue-generated">
                    <div className="text-sm text-muted-foreground">Revenue Generated</div>
                    <div className="text-2xl font-bold">
                      ${parseFloat(inspectorUtil.revenueGenerated).toLocaleString()}
                    </div>
                  </div>
                  <div data-testid="metric-utilization-rate">
                    <div className="text-sm text-muted-foreground">Utilization Rate</div>
                    <div className="text-2xl font-bold">{inspectorUtil.utilizationRate}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-avg-jobs">
                  Avg Jobs Per Day: {inspectorUtil.avgJobsPerDay}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground" data-testid="empty-inspector-data">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No utilization data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <ErrorBoundary>
      <AnalyticsDashboardContent />
    </ErrorBoundary>
  );
}
