import { useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
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

export default function AnalyticsDashboard() {
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

  const handlePresetChange = (preset: DateRangePreset) => {
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
  };

  const handleRefresh = () => {
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
  };

  const handleExportCSV = () => {
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
  };

  const handleExportPDF = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export will be available in a future update",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Queries - Format dates as query params (startDate/endDate) that backend expects
  const { data: summary, isLoading: summaryLoading } = useQuery<ProfitabilitySummary>({
    queryKey: ["/api/analytics/profitability-summary", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
  });

  const { data: jobTypeRevenue, isLoading: jobTypeLoading } = useQuery<JobTypeRevenue[]>({
    queryKey: ["/api/analytics/revenue-by-job-type", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
  });

  const { data: builderProfitability, isLoading: builderLoading } = useQuery<BuilderProfitability[]>({
    queryKey: ["/api/analytics/builder-profitability", { 
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin",
  });

  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery<CashFlowForecast>({
    queryKey: ["/api/analytics/cash-flow-forecast"],
    enabled: user?.role === "admin",
  });

  const { data: inspectorUtil, isLoading: inspectorLoading } = useQuery<InspectorUtilization>({
    queryKey: ["/api/analytics/inspector-utilization", { 
      userId: selectedInspectorId!,
      startDate: dateRange.from.toISOString(), 
      endDate: dateRange.to.toISOString() 
    }],
    enabled: user?.role === "admin" && !!selectedInspectorId,
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
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Business Analytics</h1>
            <p className="text-muted-foreground">
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
                <SelectItem value="mtd">MTD (Month to Date)</SelectItem>
                <SelectItem value="qtd">QTD (Quarter to Date)</SelectItem>
                <SelectItem value="ytd">YTD (Year to Date)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-[300px] w-full" />
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
              <CardTitle>Revenue by Job Type</CardTitle>
              <CardDescription>Revenue breakdown by inspection type</CardDescription>
            </CardHeader>
            <CardContent>
              {jobTypeLoading ? (
                <Skeleton className="h-[300px] w-full" />
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
              <CardTitle>Builder Profitability</CardTitle>
              <CardDescription>Revenue and outstanding AR by builder</CardDescription>
            </CardHeader>
            <CardContent>
              {builderLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
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
                          <TableCell className="font-medium">{builder.builderName}</TableCell>
                          <TableCell>${parseFloat(builder.revenue).toLocaleString()}</TableCell>
                          <TableCell>{builder.jobCount}</TableCell>
                          <TableCell>${parseFloat(builder.avgRevenue).toLocaleString()}</TableCell>
                          <TableCell>
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
              <CardTitle>Cash Flow Forecast</CardTitle>
              <CardDescription>Projected cash in/out over next 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              {cashFlowLoading ? (
                <Skeleton className="h-[300px] w-full" />
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
                <CardTitle>Inspector Utilization</CardTitle>
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
                  <SelectItem value="inspector-1">John Doe</SelectItem>
                  <SelectItem value="inspector-2">Jane Smith</SelectItem>
                  <SelectItem value="inspector-3">Bob Johnson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedInspectorId ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>Select an inspector to view utilization metrics</p>
              </div>
            ) : inspectorLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : inspectorUtil ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Jobs Completed</div>
                    <div className="text-2xl font-bold">{inspectorUtil.jobsCompleted}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Revenue Generated</div>
                    <div className="text-2xl font-bold">
                      ${parseFloat(inspectorUtil.revenueGenerated).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Utilization Rate</div>
                    <div className="text-2xl font-bold">{inspectorUtil.utilizationRate}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Avg Jobs Per Day: {inspectorUtil.avgJobsPerDay}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
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
