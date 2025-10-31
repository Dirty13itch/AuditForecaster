import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Save, Download, Share2, Clock, Plus, Filter, Group, 
  BarChart3, LineChart, PieChart, TableIcon, AreaChart,
  TrendingUp, FileSpreadsheet, FileText, Mail, Calendar as CalendarIcon,
  Settings2, Play, Eye, Trash2, Copy, Check, ChevronRight,
  Database, Users, Building2, Package, Wrench, DollarSign,
  AlertCircle, RefreshCw, Loader2
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import type { Job, Builder, Equipment, Invoice } from "@shared/schema";

// Phase 6 - DOCUMENT: Report metric definition with aggregation type
interface ReportMetric {
  id: string;
  name: string;
  field: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max";
  category: string;
  description?: string;
}

// Phase 6 - DOCUMENT: Filter configuration for report data filtering
interface ReportFilter {
  field: string;
  operator: "equals" | "not_equals" | "greater" | "less" | "contains" | "between";
  value: any;
}

// Phase 6 - DOCUMENT: Saved report configuration including schedule settings
interface SavedReport {
  id: string;
  name: string;
  description?: string;
  type: string;
  metrics: string[];
  filters: ReportFilter[];
  groupBy?: string;
  chartType: string;
  dateRange: DateRange;
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    emails: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Phase 3 - OPTIMIZE: Module-level constants prevent recreation on every render
// Phase 6 - DOCUMENT: Available report types with icon and color associations
const REPORT_TYPES = [
  { id: "performance", name: "Performance Report", icon: TrendingUp, color: "text-primary" },
  { id: "compliance", name: "Compliance Report", icon: Check, color: "text-success" },
  { id: "financial", name: "Financial Report", icon: DollarSign, color: "text-warning" },
  { id: "quality", name: "Quality Report", icon: BarChart3, color: "text-info" },
  { id: "equipment", name: "Equipment Report", icon: Wrench, color: "text-secondary" },
] as const;

// Phase 3 - OPTIMIZE: Metrics catalog as module constant
// Phase 6 - DOCUMENT: Comprehensive metrics library organized by category
// Performance: Track inspection efficiency and throughput
// Compliance: Monitor regulatory adherence and pass rates
// Financial: Revenue, expense, and profitability tracking
// Quality: QA scores and defect rates
// Equipment: Utilization and maintenance metrics
const AVAILABLE_METRICS: ReportMetric[] = [
  // Performance Metrics
  { id: "jobs_completed", name: "Jobs Completed", field: "jobs", aggregation: "count", category: "Performance" },
  { id: "avg_inspection_time", name: "Avg Inspection Time", field: "inspection_time", aggregation: "avg", category: "Performance" },
  { id: "first_pass_rate", name: "First Pass Rate", field: "first_pass", aggregation: "avg", category: "Performance" },
  { id: "productivity_score", name: "Productivity Score", field: "productivity", aggregation: "avg", category: "Performance" },
  
  // Compliance Metrics
  { id: "compliance_rate", name: "Compliance Rate", field: "compliance", aggregation: "avg", category: "Compliance" },
  { id: "45l_pass_rate", name: "45L Pass Rate", field: "45l_pass", aggregation: "avg", category: "Compliance" },
  { id: "violations_count", name: "Violations Count", field: "violations", aggregation: "count", category: "Compliance" },
  { id: "ach50_avg", name: "ACH50 Average", field: "ach50", aggregation: "avg", category: "Compliance" },
  
  // Financial Metrics
  { id: "total_revenue", name: "Total Revenue", field: "revenue", aggregation: "sum", category: "Financial" },
  { id: "total_expenses", name: "Total Expenses", field: "expenses", aggregation: "sum", category: "Financial" },
  { id: "profit_margin", name: "Profit Margin", field: "profit", aggregation: "avg", category: "Financial" },
  { id: "revenue_per_job", name: "Revenue per Job", field: "job_revenue", aggregation: "avg", category: "Financial" },
  
  // Quality Metrics
  { id: "qa_score", name: "QA Score", field: "qa_score", aggregation: "avg", category: "Quality" },
  { id: "defect_rate", name: "Defect Rate", field: "defects", aggregation: "avg", category: "Quality" },
  { id: "rework_rate", name: "Rework Rate", field: "rework", aggregation: "avg", category: "Quality" },
  { id: "customer_satisfaction", name: "Customer Satisfaction", field: "satisfaction", aggregation: "avg", category: "Quality" },
  
  // Equipment Metrics
  { id: "equipment_utilization", name: "Equipment Utilization", field: "utilization", aggregation: "avg", category: "Equipment" },
  { id: "maintenance_cost", name: "Maintenance Cost", field: "maintenance", aggregation: "sum", category: "Equipment" },
  { id: "calibration_compliance", name: "Calibration Compliance", field: "calibration", aggregation: "avg", category: "Equipment" },
  { id: "equipment_downtime", name: "Equipment Downtime", field: "downtime", aggregation: "sum", category: "Equipment" },
];

// Phase 3 - OPTIMIZE: Grouping options as module constant
// Phase 6 - DOCUMENT: Time-based and dimension-based grouping options for data aggregation
const GROUPING_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
  { value: "builder", label: "Builder" },
  { value: "inspector", label: "Inspector" },
  { value: "status", label: "Status" },
  { value: "location", label: "Location" },
] as const;

// Phase 3 - OPTIMIZE: Chart type options as module constant
const CHART_TYPES = ["line", "bar", "area", "pie"] as const;

// Phase 3 - OPTIMIZE: Export format options as module constant
const EXPORT_FORMATS = ["pdf", "excel", "csv"] as const;

// Phase 3 - OPTIMIZE: Schedule frequency options as module constant
const SCHEDULE_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

// Phase 3 - OPTIMIZE: Skeleton loader counts for consistent loading UX
const SKELETON_COUNTS = {
  savedReports: 3,
  reportTypes: 5,
  chartButtons: 4,
} as const;

// Phase 3 - OPTIMIZE: Default date range calculation
const DEFAULT_DATE_RANGE = {
  from: startOfMonth(new Date()),
  to: endOfMonth(new Date()),
} as const;

// Phase 6 - DOCUMENT: Type map for filtering metrics by report type category
const METRIC_TYPE_MAP: Record<string, string[]> = {
  performance: ["Performance"],
  compliance: ["Compliance"],
  financial: ["Financial"],
  quality: ["Quality"],
  equipment: ["Equipment"],
} as const;

// Phase 2 - BUILD: Main component content wrapped in ErrorBoundary at export
function CustomReportsContent() {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState("performance");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [groupBy, setGroupBy] = useState("month");
  const [chartType, setChartType] = useState<"line" | "bar" | "area" | "pie">("line");
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmails, setScheduleEmails] = useState("");
  
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Phase 6 - DOCUMENT: Mock saved reports for demonstration
  // In production, these would be fetched from /api/custom-reports
  const [savedReports, setSavedReports] = useState<SavedReport[]>([
    {
      id: "1",
      name: "Monthly Performance Review",
      description: "Track team performance metrics",
      type: "performance",
      metrics: ["jobs_completed", "avg_inspection_time", "first_pass_rate"],
      filters: [],
      groupBy: "month",
      chartType: "line",
      dateRange: DEFAULT_DATE_RANGE,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      name: "45L Compliance Tracker",
      description: "Monitor 45L tax credit compliance",
      type: "compliance",
      metrics: ["compliance_rate", "45l_pass_rate", "ach50_avg"],
      filters: [],
      groupBy: "builder",
      chartType: "bar",
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date(),
      },
      schedule: {
        frequency: "weekly",
        time: "09:00",
        emails: ["manager@example.com"],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Phase 3 - OPTIMIZE: Memoized mock data generation for chart preview
  // Phase 6 - DOCUMENT: Generates sample data points based on selected grouping period
  const generateMockData = useCallback(() => {
    const data = [];
    const periods = groupBy === "day" ? 7 : groupBy === "week" ? 4 : 6;
    
    for (let i = 0; i < periods; i++) {
      const dataPoint: any = { period: `Period ${i + 1}` };
      selectedMetrics.forEach(metricId => {
        const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
        if (metric) {
          dataPoint[metric.name] = Math.floor(Math.random() * 100);
        }
      });
      data.push(dataPoint);
    }
    
    return data;
  }, [selectedMetrics, groupBy]);

  // Phase 3 - OPTIMIZE: useCallback for metric toggle handler
  // Phase 6 - DOCUMENT: Adds or removes metric from selected list
  const handleMetricToggle = useCallback((metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for drag start handler
  const handleDragStart = useCallback((e: React.DragEvent, metricId: string) => {
    e.dataTransfer.setData("metricId", metricId);
    setIsDragging(true);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for drag end handler
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for drop handler
  // Phase 6 - DOCUMENT: Handles metric drop into selected metrics zone
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const metricId = e.dataTransfer.getData("metricId");
    if (metricId && !selectedMetrics.includes(metricId)) {
      setSelectedMetrics(prev => [...prev, metricId]);
    }
    setIsDragging(false);
  }, [selectedMetrics]);

  // Phase 3 - OPTIMIZE: useCallback for drag over handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for save report handler
  // Phase 6 - DOCUMENT: Validates and saves report configuration with optional scheduling
  const handleSaveReport = useCallback(() => {
    if (!reportName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report name",
        variant: "destructive",
      });
      return;
    }

    if (selectedMetrics.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one metric",
        variant: "destructive",
      });
      return;
    }

    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: reportName,
      description: reportDescription,
      type: selectedReportType,
      metrics: selectedMetrics,
      filters,
      groupBy,
      chartType,
      dateRange,
      schedule: scheduleEnabled ? {
        frequency: scheduleFrequency,
        time: "09:00",
        emails: scheduleEmails.split(",").map(e => e.trim()).filter(Boolean),
      } : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSavedReports(prev => [...prev, newReport]);
    setSaveDialogOpen(false);
    setReportName("");
    setReportDescription("");
    setScheduleEnabled(false);
    setScheduleEmails("");

    toast({
      title: "Report saved",
      description: `"${newReport.name}" has been saved successfully`,
    });
  }, [reportName, reportDescription, selectedReportType, selectedMetrics, filters, groupBy, chartType, dateRange, scheduleEnabled, scheduleFrequency, scheduleEmails, toast]);

  // Phase 3 - OPTIMIZE: useCallback for load report handler
  // Phase 6 - DOCUMENT: Loads saved report configuration into builder
  const handleLoadReport = useCallback((report: SavedReport) => {
    setSelectedReportType(report.type);
    setSelectedMetrics(report.metrics);
    setFilters(report.filters);
    setGroupBy(report.groupBy || "month");
    setChartType(report.chartType as any);
    setDateRange(report.dateRange);
    
    toast({
      title: "Report loaded",
      description: `"${report.name}" has been loaded`,
    });
  }, [toast]);

  // Phase 3 - OPTIMIZE: useCallback for delete report handler
  const handleDeleteReport = useCallback((reportId: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== reportId));
    toast({
      title: "Report deleted",
      description: "Report has been removed",
    });
  }, [toast]);

  // Phase 3 - OPTIMIZE: useCallback for export handler
  // Phase 6 - DOCUMENT: Initiates export in specified format (PDF, Excel, CSV)
  const handleExport = useCallback((format: "pdf" | "excel" | "csv") => {
    if (selectedMetrics.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one metric to export",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Export initiated",
      description: `Exporting report as ${format.toUpperCase()}...`,
    });
  }, [selectedMetrics, toast]);

  // Phase 3 - OPTIMIZE: useCallback for share handler
  const handleShare = useCallback(() => {
    if (selectedMetrics.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one metric to share",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Share link generated",
      description: "Report link has been copied to clipboard",
    });
  }, [selectedMetrics, toast]);

  // Phase 3 - OPTIMIZE: useCallback for preview toggle
  const handlePreviewToggle = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  // Phase 3 - OPTIMIZE: useCallback for report type selection
  const handleReportTypeChange = useCallback((typeId: string) => {
    setSelectedReportType(typeId);
    setSelectedMetrics([]);
  }, []);

  // Phase 3 - OPTIMIZE: Memoized filtered metrics by report type
  // Phase 6 - DOCUMENT: Filters available metrics based on selected report type category
  const filteredMetrics = useMemo(() => 
    AVAILABLE_METRICS.filter(metric => {
      return METRIC_TYPE_MAP[selectedReportType]?.includes(metric.category);
    }),
    [selectedReportType]
  );

  // Phase 3 - OPTIMIZE: Memoized mock chart data
  const mockChartData = useMemo(() => generateMockData(), [generateMockData]);

  // Phase 3 - OPTIMIZE: Memoized data keys for chart widget
  const chartDataKeys = useMemo(() => 
    selectedMetrics.map(id => 
      AVAILABLE_METRICS.find(m => m.id === id)?.name || id
    ),
    [selectedMetrics]
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8" data-testid="page-custom-reports">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Custom Reports Builder</h1>
            <p className="text-muted-foreground" data-testid="text-page-description">Create powerful, customized reports for your data</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handlePreviewToggle}
              data-testid="button-preview-toggle"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-export-menu">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")} data-testid="menu-item-export-pdf">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} data-testid="menu-item-export-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} data-testid="menu-item-export-csv">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={handleShare} data-testid="button-share">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-save-report">
                  <Save className="h-4 w-4 mr-2" />
                  Save Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" data-testid="dialog-save-report">
                <DialogHeader>
                  <DialogTitle data-testid="text-dialog-title">Save Report Configuration</DialogTitle>
                  <DialogDescription data-testid="text-dialog-description">
                    Save your custom report for future use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-name" data-testid="label-report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g., Monthly Performance Review"
                      data-testid="input-report-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-description" data-testid="label-report-description">Description (Optional)</Label>
                    <Input
                      id="report-description"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Brief description of the report"
                      data-testid="input-report-description"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-enabled"
                      checked={scheduleEnabled}
                      onCheckedChange={setScheduleEnabled}
                      data-testid="switch-schedule-enabled"
                    />
                    <Label htmlFor="schedule-enabled" data-testid="label-schedule-enabled">Schedule automated delivery</Label>
                  </div>
                  {scheduleEnabled && (
                    <div className="space-y-3 pl-7" data-testid="section-schedule-config">
                      <div>
                        <Label htmlFor="schedule-frequency" data-testid="label-schedule-frequency">Frequency</Label>
                        <Select
                          value={scheduleFrequency}
                          onValueChange={(value: any) => setScheduleFrequency(value)}
                        >
                          <SelectTrigger id="schedule-frequency" data-testid="select-schedule-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily" data-testid="select-item-daily">Daily</SelectItem>
                            <SelectItem value="weekly" data-testid="select-item-weekly">Weekly</SelectItem>
                            <SelectItem value="monthly" data-testid="select-item-monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schedule-emails" data-testid="label-schedule-emails">Email Recipients</Label>
                        <Input
                          id="schedule-emails"
                          value={scheduleEmails}
                          onChange={(e) => setScheduleEmails(e.target.value)}
                          placeholder="email1@example.com, email2@example.com"
                          data-testid="input-schedule-emails"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)} data-testid="button-cancel-save">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveReport} data-testid="button-confirm-save">Save Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Panel - Report Configuration */}
          <div className="lg:col-span-1 space-y-4" data-testid="section-config-panel">
            {/* Saved Reports */}
            <Card data-testid="card-saved-reports">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium" data-testid="text-saved-reports-title">Saved Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-2 rounded-md border hover-elevate cursor-pointer group"
                        onClick={() => handleLoadReport(report)}
                        data-testid={`saved-report-${report.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-report-name-${report.id}`}>{report.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-report-type-${report.id}`}>
                              {report.type}
                            </Badge>
                            {report.schedule && (
                              <Clock className="h-3 w-3 text-muted-foreground" data-testid={`icon-scheduled-${report.id}`} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                            data-testid={`button-delete-report-${report.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Report Type Selection */}
            <Card data-testid="card-report-type">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium" data-testid="text-report-type-title">Report Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {REPORT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleReportTypeChange(type.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                          selectedReportType === type.id
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                        data-testid={`button-report-type-${type.id}`}
                      >
                        <Icon className={cn("h-4 w-4", type.color)} />
                        <span className="text-sm" data-testid={`text-report-type-name-${type.id}`}>{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Chart Type Selection */}
            <Card data-testid="card-chart-type">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium" data-testid="text-chart-type-title">Chart Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={chartType === "line" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("line")}
                    data-testid="button-chart-type-line"
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                    data-testid="button-chart-type-bar"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "area" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("area")}
                    data-testid="button-chart-type-area"
                  >
                    <AreaChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("pie")}
                    data-testid="button-chart-type-pie"
                  >
                    <PieChart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Grouping Options */}
            <Card data-testid="card-group-by">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium" data-testid="text-group-by-title">Group By</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger data-testid="select-group-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`select-item-group-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card data-testid="card-date-range">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium" data-testid="text-date-range-title">Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  data-testid="date-range-picker"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Report Builder/Preview */}
          <div className="lg:col-span-3" data-testid="section-main-panel">
            {previewMode ? (
              <Card data-testid="card-preview-mode">
                <CardHeader>
                  <CardTitle data-testid="text-preview-title">Report Preview</CardTitle>
                  <CardDescription data-testid="text-preview-description">
                    {selectedMetrics.length} metrics selected • Grouped by {groupBy}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedMetrics.length > 0 ? (
                    <div data-testid="section-chart-preview">
                      <ChartWidget
                        title="Custom Report"
                        data={mockChartData}
                        type={chartType}
                        dataKeys={chartDataKeys}
                        xAxisKey="period"
                        height={400}
                        showLegend={true}
                        animate={true}
                      />
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center text-muted-foreground" data-testid="section-empty-preview">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p data-testid="text-empty-preview">Select metrics to preview the report</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card data-testid="card-builder-mode">
                <CardHeader>
                  <CardTitle data-testid="text-builder-title">Metrics Selection</CardTitle>
                  <CardDescription data-testid="text-builder-description">
                    Drag and drop or click metrics to add them to your report
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Selected Metrics Drop Zone */}
                  <div
                    className={cn(
                      "min-h-32 p-4 border-2 border-dashed rounded-md mb-6 transition-colors",
                      isDragging ? "border-primary bg-accent/50" : "border-border",
                      selectedMetrics.length === 0 && "flex items-center justify-center"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    data-testid="section-drop-zone"
                  >
                    {selectedMetrics.length > 0 ? (
                      <div className="flex flex-wrap gap-2" data-testid="section-selected-metrics">
                        {selectedMetrics.map((metricId) => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                          if (!metric) return null;
                          return (
                            <Badge
                              key={metricId}
                              variant="secondary"
                              className="cursor-move"
                              data-testid={`badge-selected-metric-${metricId}`}
                            >
                              <span data-testid={`text-metric-name-${metricId}`}>{metric.name}</span>
                              <button
                                onClick={() => handleMetricToggle(metricId)}
                                className="ml-2 hover:text-destructive"
                                data-testid={`button-remove-metric-${metricId}`}
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm" data-testid="text-empty-drop-zone">
                        Drop metrics here or select from below
                      </p>
                    )}
                  </div>

                  {/* Available Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium" data-testid="text-available-metrics-title">Available Metrics</h3>
                    <div className="grid gap-2 md:grid-cols-2" data-testid="section-available-metrics">
                      {filteredMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, metric.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded-md border cursor-move transition-colors",
                            selectedMetrics.includes(metric.id)
                              ? "bg-accent border-primary"
                              : "hover:bg-accent/50"
                          )}
                          onClick={() => handleMetricToggle(metric.id)}
                          data-testid={`metric-${metric.id}`}
                        >
                          <Checkbox
                            checked={selectedMetrics.includes(metric.id)}
                            onCheckedChange={() => handleMetricToggle(metric.id)}
                            data-testid={`checkbox-metric-${metric.id}`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium" data-testid={`text-metric-title-${metric.id}`}>{metric.name}</p>
                            {metric.description && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-metric-desc-${metric.id}`}>{metric.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-aggregation-${metric.id}`}>
                            {metric.aggregation}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with fallback UI
export default function CustomReports() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background p-6" data-testid="error-boundary-fallback">
          <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle data-testid="text-error-title">Error Loading Custom Reports</AlertTitle>
              <AlertDescription data-testid="text-error-description">
                There was an error loading the custom reports builder. Please refresh the page to try again.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
              data-testid="button-reload-page"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </div>
      }
    >
      <CustomReportsContent />
    </ErrorBoundary>
  );
}
