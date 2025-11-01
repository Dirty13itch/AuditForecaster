import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Building2,
  DollarSign,
  Package,
  AlertCircle,
  FileBarChart,
  FileSpreadsheet,
  FilePlus,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";
import type { TaxCreditProject, Builder } from "@shared/schema";

interface BuilderSummary {
  builderId: string;
  builderName: string;
  totalProjects: number;
  totalUnits: number;
  qualifiedUnits: number;
  totalCredits: number;
  complianceRate: number;
  averageHersIndex: number;
}

interface TaxYearSummary {
  year: number;
  projects: number;
  totalUnits: number;
  qualifiedUnits: number;
  totalCredits: number;
  pendingProjects: number;
  certifiedProjects: number;
  claimedCredits: number;
}

function TaxCreditReportsContent() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBuilder, setSelectedBuilder] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  const { toast } = useToast();

  // Fetch all projects with retry: 2
  const { 
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery<{ data: TaxCreditProject[] }>({
    queryKey: ["/api/tax-credit-projects", { limit: 1000 }],
    retry: 2,
  });

  const projects = projectsData?.data || [];

  // Fetch builders with retry: 2
  const { 
    data: buildersData,
    isLoading: buildersLoading,
    error: buildersError,
    refetch: refetchBuilders
  } = useQuery<{ data: Builder[] }>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  const builders = buildersData?.data || [];

  // Phase 3 - OPTIMIZE: Memoize expensive calculations
  // Calculate builder summaries
  const builderSummaries = useMemo<BuilderSummary[]>(() => {
    return builders.map(builder => {
      const builderProjects = projects.filter(p => p.builderId === builder.id);
      const totalUnits = builderProjects.reduce((sum, p) => sum + (p.totalUnits || 0), 0);
      const qualifiedUnits = builderProjects.reduce((sum, p) => sum + (p.qualifiedUnits || 0), 0);
      const totalCredits = builderProjects.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0);
      
      return {
        builderId: builder.id,
        builderName: builder.name,
        totalProjects: builderProjects.length,
        totalUnits,
        qualifiedUnits,
        totalCredits,
        complianceRate: totalUnits > 0 ? (qualifiedUnits / totalUnits) * 100 : 0,
        averageHersIndex: 52,
      };
    });
  }, [builders, projects]);

  // Calculate tax year summaries
  const taxYearSummaries = useMemo<TaxYearSummary[]>(() => {
    return [2023, 2024, 2025].map(year => {
      const yearProjects = projects.filter(p => p.taxYear === year);
      const totalUnits = yearProjects.reduce((sum, p) => sum + (p.totalUnits || 0), 0);
      const qualifiedUnits = yearProjects.reduce((sum, p) => sum + (p.qualifiedUnits || 0), 0);
      const totalCredits = yearProjects.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0);
      
      return {
        year,
        projects: yearProjects.length,
        totalUnits,
        qualifiedUnits,
        totalCredits,
        pendingProjects: yearProjects.filter(p => p.status === 'pending').length,
        certifiedProjects: yearProjects.filter(p => p.status === 'certified').length,
        claimedCredits: yearProjects.filter(p => p.status === 'claimed').reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0),
      };
    });
  }, [projects]);

  // Filter data based on selections
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const yearMatch = selectedYear === 0 || p.taxYear === selectedYear;
      const builderMatch = selectedBuilder === "all" || p.builderId === selectedBuilder;
      return yearMatch && builderMatch;
    });
  }, [projects, selectedYear, selectedBuilder]);

  // Calculate overall statistics
  const totalProjects = useMemo(() => filteredProjects.length, [filteredProjects]);
  
  const totalUnits = useMemo(() => 
    filteredProjects.reduce((sum, p) => sum + (p.totalUnits || 0), 0),
    [filteredProjects]
  );
  
  const qualifiedUnits = useMemo(() => 
    filteredProjects.reduce((sum, p) => sum + (p.qualifiedUnits || 0), 0),
    [filteredProjects]
  );
  
  const totalPotentialCredits = useMemo(() => 
    filteredProjects.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0),
    [filteredProjects]
  );
  
  const overallComplianceRate = useMemo(() => 
    totalUnits > 0 ? (qualifiedUnits / totalUnits) * 100 : 0,
    [totalUnits, qualifiedUnits]
  );

  // Chart data
  const projectStatusData = useMemo(() => [
    { name: 'Pending', value: filteredProjects.filter(p => p.status === 'pending').length, color: '#fbbf24' },
    { name: 'Certified', value: filteredProjects.filter(p => p.status === 'certified').length, color: '#10b981' },
    { name: 'Claimed', value: filteredProjects.filter(p => p.status === 'claimed').length, color: '#3b82f6' },
    { name: 'Denied', value: filteredProjects.filter(p => p.status === 'denied').length, color: '#ef4444' },
  ], [filteredProjects]);

  const monthlyTrendData = useMemo(() => [
    { month: 'Jan', projects: 2, credits: 50000 },
    { month: 'Feb', projects: 3, credits: 75000 },
    { month: 'Mar', projects: 5, credits: 125000 },
    { month: 'Apr', projects: 4, credits: 100000 },
    { month: 'May', projects: 6, credits: 150000 },
    { month: 'Jun', projects: 8, credits: 200000 },
  ], []);

  const complianceByTypeData = useMemo(() => [
    { type: 'Single Family', compliance: 95 },
    { type: 'Multifamily', compliance: 88 },
    { type: 'Manufactured', compliance: 92 },
  ], []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleExportCSV = useCallback(() => {
    toast({
      title: "Export Started",
      description: "Exporting data to CSV...",
    });
  }, [toast]);

  const handleExportPDF = useCallback(() => {
    toast({
      title: "Export Started",
      description: "Generating PDF report...",
    });
  }, [toast]);

  const handleExportIRS = useCallback(() => {
    toast({
      title: "Export Started",
      description: "Generating IRS Form 8908...",
    });
  }, [toast]);

  // Loading state
  const isLoading = projectsLoading || buildersLoading;
  
  // Error state
  if (projectsError || buildersError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">45L Tax Credit Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analytics, summaries, and export options for tax credit data
            </p>
          </div>
        </div>

        {projectsError && (
          <Alert variant="destructive" data-testid="alert-error-projects">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Projects</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load tax credit projects. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchProjects()}
                data-testid="button-retry-projects"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {buildersError && (
          <Alert variant="destructive" data-testid="alert-error-builders">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Builders</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load builders. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchBuilders()}
                data-testid="button-retry-builders"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <Skeleton className="h-9 w-80" data-testid="skeleton-title" />
            <Skeleton className="h-4 w-96 mt-2" data-testid="skeleton-description" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" data-testid="skeleton-button-1" />
            <Skeleton className="h-10 w-32" data-testid="skeleton-button-2" />
            <Skeleton className="h-10 w-40" data-testid="skeleton-button-3" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card data-testid="skeleton-filters">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} data-testid={`skeleton-metric-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Skeleton */}
        <Card data-testid="skeleton-charts">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <Card data-testid="skeleton-table">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-tax-credit-reports">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">45L Tax Credit Reports</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Analytics, summaries, and export options for tax credit data
          </p>
        </div>
        <div className="flex gap-2" data-testid="group-export-buttons">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleExportIRS} data-testid="button-export-irs">
            <Download className="mr-2 h-4 w-4" />
            IRS Form 8908
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle data-testid="text-filters-title">Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="year">Tax Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger id="year" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" data-testid="select-year-all">All Years</SelectItem>
                  <SelectItem value="2023" data-testid="select-year-2023">2023</SelectItem>
                  <SelectItem value="2024" data-testid="select-year-2024">2024</SelectItem>
                  <SelectItem value="2025" data-testid="select-year-2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="builder">Builder</Label>
              <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
                <SelectTrigger id="builder" data-testid="select-builder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-builder-all">All Builders</SelectItem>
                  {builders.map(builder => (
                    <SelectItem key={builder.id} value={builder.id} data-testid={`select-builder-${builder.id}`}>
                      {builder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" data-testid="button-generate-report">
                <FileBarChart className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="group-metric-cards">
        <Card data-testid="card-metric-total-projects">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-projects">{totalProjects}</div>
            <p className="text-xs text-muted-foreground" data-testid="text-certified-count">
              {filteredProjects.filter(p => p.status === 'certified').length} certified
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-metric-qualified-units">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Units</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-qualified-units">
              {qualifiedUnits}/{totalUnits}
            </div>
            <Progress value={overallComplianceRate} className="mt-2" data-testid="progress-compliance" />
          </CardContent>
        </Card>

        <Card data-testid="card-metric-total-credits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-credits">
              {formatCurrency(totalPotentialCredits)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-credit-formula">
              {qualifiedUnits} units × $2,500
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-metric-compliance-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-compliance-rate">
              {Math.round(overallComplianceRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall qualification rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-main">
        <TabsList data-testid="tabslist-main">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="builders" data-testid="tab-builders">Builder Reports</TabsTrigger>
          <TabsTrigger value="taxyear" data-testid="tab-taxyear">Tax Year Summary</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4" data-testid="content-overview">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Project Status Distribution */}
            <Card data-testid="card-chart-status">
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} data-testid="chart-status-pie">
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card data-testid="card-chart-monthly">
              <CardHeader>
                <CardTitle>Monthly Credit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300} data-testid="chart-monthly-trend">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="credits" stroke="#10b981" name="Credits" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Certifications */}
          <Card data-testid="card-table-recent">
            <CardHeader>
              <CardTitle>Recent Certifications</CardTitle>
              <CardDescription>Latest 45L projects certified for tax credit</CardDescription>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-recent-certifications">
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Builder</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Credit Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects
                    .filter(p => p.status === 'certified')
                    .slice(0, 5)
                    .map(project => (
                      <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                        <TableCell className="font-medium" data-testid={`cell-name-${project.id}`}>{project.projectName}</TableCell>
                        <TableCell data-testid={`cell-builder-${project.id}`}>
                          {builders.find(b => b.id === project.builderId)?.name || 'Unknown'}
                        </TableCell>
                        <TableCell data-testid={`cell-units-${project.id}`}>
                          {project.qualifiedUnits}/{project.totalUnits}
                        </TableCell>
                        <TableCell data-testid={`cell-amount-${project.id}`}>{formatCurrency(parseFloat(project.creditAmount || '0'))}</TableCell>
                        <TableCell data-testid={`cell-status-${project.id}`}>
                          <Badge className="bg-green-500">Certified</Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-date-${project.id}`}>
                          {project.certificationDate 
                            ? format(new Date(project.certificationDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builders" className="space-y-4" data-testid="content-builders">
          <Card data-testid="card-table-builders">
            <CardHeader>
              <CardTitle>Builder Performance Summary</CardTitle>
              <CardDescription>45L tax credit performance by builder</CardDescription>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-builder-summary">
                <TableHeader>
                  <TableRow>
                    <TableHead>Builder</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Total Units</TableHead>
                    <TableHead>Qualified</TableHead>
                    <TableHead>Compliance Rate</TableHead>
                    <TableHead>Total Credits</TableHead>
                    <TableHead>Avg HERS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {builderSummaries.map(summary => (
                    <TableRow key={summary.builderId} data-testid={`row-builder-${summary.builderId}`}>
                      <TableCell className="font-medium" data-testid={`cell-builder-name-${summary.builderId}`}>{summary.builderName}</TableCell>
                      <TableCell data-testid={`cell-builder-projects-${summary.builderId}`}>{summary.totalProjects}</TableCell>
                      <TableCell data-testid={`cell-builder-units-${summary.builderId}`}>{summary.totalUnits}</TableCell>
                      <TableCell data-testid={`cell-builder-qualified-${summary.builderId}`}>{summary.qualifiedUnits}</TableCell>
                      <TableCell data-testid={`cell-builder-compliance-${summary.builderId}`}>
                        <div className="flex items-center gap-2">
                          <Progress value={summary.complianceRate} className="w-16" />
                          <span className="text-sm">{Math.round(summary.complianceRate)}%</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-builder-credits-${summary.builderId}`}>{formatCurrency(summary.totalCredits)}</TableCell>
                      <TableCell data-testid={`cell-builder-hers-${summary.builderId}`}>{summary.averageHersIndex}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Compliance by Project Type */}
          <Card data-testid="card-chart-compliance">
            <CardHeader>
              <CardTitle>Compliance by Project Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300} data-testid="chart-compliance-bar">
                <BarChart data={complianceByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="compliance" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxyear" className="space-y-4" data-testid="content-taxyear">
          <Card data-testid="card-table-taxyear">
            <CardHeader>
              <CardTitle>Tax Year Summary</CardTitle>
              <CardDescription>45L tax credit summary by tax year</CardDescription>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-tax-year">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Year</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Total Units</TableHead>
                    <TableHead>Qualified Units</TableHead>
                    <TableHead>Total Credits</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Certified</TableHead>
                    <TableHead>Claimed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxYearSummaries.map(summary => (
                    <TableRow key={summary.year} data-testid={`row-year-${summary.year}`}>
                      <TableCell className="font-medium" data-testid={`cell-year-${summary.year}`}>{summary.year}</TableCell>
                      <TableCell data-testid={`cell-year-projects-${summary.year}`}>{summary.projects}</TableCell>
                      <TableCell data-testid={`cell-year-units-${summary.year}`}>{summary.totalUnits}</TableCell>
                      <TableCell data-testid={`cell-year-qualified-${summary.year}`}>{summary.qualifiedUnits}</TableCell>
                      <TableCell data-testid={`cell-year-credits-${summary.year}`}>{formatCurrency(summary.totalCredits)}</TableCell>
                      <TableCell data-testid={`cell-year-pending-${summary.year}`}>
                        <Badge variant="outline" className="bg-yellow-500">
                          {summary.pendingProjects}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-year-certified-${summary.year}`}>
                        <Badge variant="outline" className="bg-green-500">
                          {summary.certifiedProjects}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-year-claimed-${summary.year}`}>{formatCurrency(summary.claimedCredits)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tax Year Deadlines */}
          <Card data-testid="card-deadlines">
            <CardHeader>
              <CardTitle>Important Deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert data-testid="alert-deadline-corporate">
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>March 15, {selectedYear + 1}:</strong> Corporate tax filing deadline for C-corporations
                </AlertDescription>
              </Alert>
              
              <Alert data-testid="alert-deadline-individual">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>April 15, {selectedYear + 1}:</strong> Individual and partnership tax filing deadline
                </AlertDescription>
              </Alert>
              
              <Alert data-testid="alert-deadline-extended">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>September 15, {selectedYear + 1}:</strong> Extended corporate tax filing deadline
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4" data-testid="content-analytics">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Common Failure Points */}
            <Card data-testid="card-failure-points">
              <CardHeader>
                <CardTitle>Common Failure Points</CardTitle>
                <CardDescription>Most frequent reasons for non-qualification</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between" data-testid="item-failure-hers">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">HERS Index {">"} 55</span>
                    </div>
                    <span className="text-sm font-medium">23%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-failure-savings">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Energy Savings {"<"} 50%</span>
                    </div>
                    <span className="text-sm font-medium">18%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-failure-docs">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Missing Documentation</span>
                    </div>
                    <span className="text-sm font-medium">15%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-failure-air">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Failed Air Tightness</span>
                    </div>
                    <span className="text-sm font-medium">12%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-failure-duct">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Duct Leakage Exceeded</span>
                    </div>
                    <span className="text-sm font-medium">10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success Factors */}
            <Card data-testid="card-success-factors">
              <CardHeader>
                <CardTitle>Success Factors</CardTitle>
                <CardDescription>Common characteristics of qualified projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between" data-testid="item-success-hvac">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">High-efficiency HVAC</span>
                    </div>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-success-insulation">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Grade I Insulation</span>
                    </div>
                    <span className="text-sm font-medium">88%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-success-windows">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Low-E Windows</span>
                    </div>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-success-ach50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">ACH50 &lt; 3.0</span>
                    </div>
                    <span className="text-sm font-medium">82%</span>
                  </div>
                  <div className="flex items-center justify-between" data-testid="item-success-ducts">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Sealed Ductwork</span>
                    </div>
                    <span className="text-sm font-medium">79%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card data-testid="card-export-options">
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Generate reports and export data for various purposes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto py-4" data-testid="button-irs-8908">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm">IRS Form 8908</span>
                    <span className="text-xs text-muted-foreground">Tax filing data</span>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto py-4" data-testid="button-builder-summary">
                  <div className="flex flex-col items-center gap-2">
                    <FilePlus className="h-5 w-5" />
                    <span className="text-sm">Builder Summary</span>
                    <span className="text-xs text-muted-foreground">Performance report</span>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto py-4" data-testid="button-tax-software">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    <span className="text-sm">Tax Software Export</span>
                    <span className="text-xs text-muted-foreground">CSV format</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TaxCreditReports() {
  return (
    <ErrorBoundary>
      <TaxCreditReportsContent />
    </ErrorBoundary>
  );
}
