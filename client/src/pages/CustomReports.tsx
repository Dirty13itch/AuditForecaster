import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  Save, Download, Share2, Clock, Plus, Filter, Group, 
  BarChart3, LineChart, PieChart, TableIcon, AreaChart,
  TrendingUp, FileSpreadsheet, FileText, Mail, Calendar as CalendarIcon,
  Settings2, Play, Eye, Trash2, Copy, Check, ChevronRight,
  Database, Users, Building2, Package, Wrench, DollarSign
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import type { Job, Builder, Equipment, Invoice } from "@shared/schema";

interface ReportMetric {
  id: string;
  name: string;
  field: string;
  aggregation: "sum" | "avg" | "count" | "min" | "max";
  category: string;
  description?: string;
}

interface ReportFilter {
  field: string;
  operator: "equals" | "not_equals" | "greater" | "less" | "contains" | "between";
  value: any;
}

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

const REPORT_TYPES = [
  { id: "performance", name: "Performance Report", icon: TrendingUp, color: "text-primary" },
  { id: "compliance", name: "Compliance Report", icon: Check, color: "text-success" },
  { id: "financial", name: "Financial Report", icon: DollarSign, color: "text-warning" },
  { id: "quality", name: "Quality Report", icon: BarChart3, color: "text-info" },
  { id: "equipment", name: "Equipment Report", icon: Wrench, color: "text-secondary" },
];

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
];

export default function CustomReports() {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState("performance");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [groupBy, setGroupBy] = useState("month");
  const [chartType, setChartType] = useState<"line" | "bar" | "area" | "pie">("line");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [scheduleEmails, setScheduleEmails] = useState("");
  
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Mock saved reports
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
      dateRange: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      },
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

  // Mock data generation for preview
  const generateMockData = () => {
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
  };

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleDragStart = (e: React.DragEvent, metricId: string) => {
    e.dataTransfer.setData("metricId", metricId);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const metricId = e.dataTransfer.getData("metricId");
    if (metricId && !selectedMetrics.includes(metricId)) {
      setSelectedMetrics(prev => [...prev, metricId]);
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSaveReport = () => {
    if (!reportName) {
      toast({
        title: "Error",
        description: "Please enter a report name",
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
  };

  const handleLoadReport = (report: SavedReport) => {
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
  };

  const handleExport = (format: "pdf" | "excel" | "csv") => {
    toast({
      title: "Export initiated",
      description: `Exporting report as ${format.toUpperCase()}...`,
    });
  };

  const handleShare = () => {
    toast({
      title: "Share link generated",
      description: "Report link has been copied to clipboard",
    });
  };

  const filteredMetrics = AVAILABLE_METRICS.filter(metric => {
    const typeMap: Record<string, string[]> = {
      performance: ["Performance"],
      compliance: ["Compliance"],
      financial: ["Financial"],
      quality: ["Quality"],
      equipment: ["Equipment"],
    };
    return typeMap[selectedReportType]?.includes(metric.category);
  });

  const mockChartData = useMemo(() => generateMockData(), [selectedMetrics, groupBy]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Custom Reports Builder</h1>
            <p className="text-muted-foreground">Create powerful, customized reports for your data</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              data-testid="button-preview-toggle"
            >
              <Eye className="h-4 w-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Save Report Configuration</DialogTitle>
                  <DialogDescription>
                    Save your custom report for future use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g., Monthly Performance Review"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-description">Description (Optional)</Label>
                    <Input
                      id="report-description"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Brief description of the report"
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="schedule-enabled"
                      checked={scheduleEnabled}
                      onCheckedChange={setScheduleEnabled}
                    />
                    <Label htmlFor="schedule-enabled">Schedule automated delivery</Label>
                  </div>
                  {scheduleEnabled && (
                    <div className="space-y-3 pl-7">
                      <div>
                        <Label htmlFor="schedule-frequency">Frequency</Label>
                        <Select
                          value={scheduleFrequency}
                          onValueChange={(value: any) => setScheduleFrequency(value)}
                        >
                          <SelectTrigger id="schedule-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schedule-emails">Email Recipients</Label>
                        <Input
                          id="schedule-emails"
                          value={scheduleEmails}
                          onChange={(e) => setScheduleEmails(e.target.value)}
                          placeholder="email1@example.com, email2@example.com"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveReport}>Save Report</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left Panel - Report Configuration */}
          <div className="lg:col-span-1 space-y-4">
            {/* Saved Reports */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Saved Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {savedReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-2 rounded-md border hover-elevate cursor-pointer"
                        onClick={() => handleLoadReport(report)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{report.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {report.type}
                            </Badge>
                            {report.schedule && (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Report Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Report Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {REPORT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedReportType(type.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                          selectedReportType === type.id
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", type.color)} />
                        <span className="text-sm">{type.name}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Chart Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Chart Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={chartType === "line" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("line")}
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "area" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("area")}
                  >
                    <AreaChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("pie")}
                  >
                    <PieChart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Grouping Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Group By</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Date Range */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Report Builder/Preview */}
          <div className="lg:col-span-3">
            {previewMode ? (
              <Card>
                <CardHeader>
                  <CardTitle>Report Preview</CardTitle>
                  <CardDescription>
                    {selectedMetrics.length} metrics selected • Grouped by {groupBy}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedMetrics.length > 0 ? (
                    <ChartWidget
                      title="Custom Report"
                      data={mockChartData}
                      type={chartType}
                      dataKeys={selectedMetrics.map(id => 
                        AVAILABLE_METRICS.find(m => m.id === id)?.name || id
                      )}
                      xAxisKey="period"
                      height={400}
                      showLegend={true}
                      animate={true}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select metrics to preview the report</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Metrics Selection</CardTitle>
                  <CardDescription>
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
                  >
                    {selectedMetrics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedMetrics.map((metricId) => {
                          const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                          if (!metric) return null;
                          return (
                            <Badge
                              key={metricId}
                              variant="secondary"
                              className="cursor-move"
                            >
                              {metric.name}
                              <button
                                onClick={() => handleMetricToggle(metricId)}
                                className="ml-2 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Drop metrics here or select from below
                      </p>
                    )}
                  </div>

                  {/* Available Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Available Metrics</h3>
                    <div className="grid gap-2 md:grid-cols-2">
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
                        >
                          <Checkbox
                            checked={selectedMetrics.includes(metric.id)}
                            onCheckedChange={() => handleMetricToggle(metric.id)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{metric.name}</p>
                            {metric.description && (
                              <p className="text-xs text-muted-foreground">{metric.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
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