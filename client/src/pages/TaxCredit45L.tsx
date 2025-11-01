import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCardSkeleton, ListItemSkeleton } from "@/components/ui/skeleton-variants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  Building2, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Plus,
  Upload,
  ClipboardCheck,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { TaxCreditProject } from "@shared/schema";

function TaxCredit45LContent() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery({
    queryKey: ["/api/tax-credit-summary"],
    retry: 2,
  });

  const { data: projects, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useQuery<TaxCreditProject[]>({
    queryKey: [`/api/tax-credit-projects/year/${selectedYear}`],
    retry: 2,
  });

  const { data: recentProjects, isLoading: recentLoading, error: recentError, refetch: refetchRecent } = useQuery<{ data: TaxCreditProject[], total: number }>({
    queryKey: ["/api/tax-credit-projects", { limit: 5 }],
    retry: 2,
  });

  const isLoading = summaryLoading || projectsLoading || recentLoading;

  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };
  }, []);

  const getStatusColor = useMemo(() => {
    return (status: string) => {
      switch (status) {
        case 'certified':
          return 'bg-green-500';
        case 'pending':
          return 'bg-yellow-500';
        case 'claimed':
          return 'bg-blue-500';
        case 'denied':
          return 'bg-red-500';
        default:
          return 'bg-gray-500';
      }
    };
  }, []);

  const getProjectTypeIcon = useMemo(() => {
    return (type: string) => {
      switch (type) {
        case 'single-family':
          return <Home className="h-4 w-4" />;
        case 'multifamily':
          return <Building2 className="h-4 w-4" />;
        default:
          return <Package className="h-4 w-4" />;
      }
    };
  }, []);

  const yearTotal = useMemo(() => {
    return projects?.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0) || 0;
  }, [projects]);

  const qualifiedPercentage = useMemo(() => {
    return Math.round((summary?.qualifiedUnits || 0) / Math.max(summary?.totalUnits || 1, 1) * 100);
  }, [summary]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">45L Tax Credit Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track IRS Section 45L compliance for $2,500 energy-efficient home credits
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tax-credits/projects/new">
            <Button data-testid="button-new-project">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Error State for Summary */}
      {summaryError && (
        <Alert variant="destructive" data-testid="alert-error-summary">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load tax credit summary. Please try again.</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchSummary()}
              data-testid="button-retry-summary"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="grid-metrics">
        {summaryLoading ? (
          <>
            <MetricCardSkeleton data-testid="skeleton-metric-0" />
            <MetricCardSkeleton data-testid="skeleton-metric-1" />
            <MetricCardSkeleton data-testid="skeleton-metric-2" />
            <MetricCardSkeleton data-testid="skeleton-metric-3" />
          </>
        ) : (
          <>
            <Card data-testid="card-metric-total-credits">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Potential Credits</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" data-testid="icon-total-credits" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-credits">
                  {formatCurrency(summary?.totalPotentialCredits || 0)}
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-qualified-units">
                  {summary?.qualifiedUnits || 0} qualified units × $2,500
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-active-projects">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" data-testid="icon-active-projects" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-projects">
                  {summary?.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-project-breakdown">
                  {summary?.pendingProjects || 0} pending, {summary?.certifiedProjects || 0} certified
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-compliance-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" data-testid="icon-compliance-rate" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-compliance-rate">
                  {Math.round(summary?.complianceRate || 0)}%
                </div>
                <Progress value={summary?.complianceRate || 0} className="mt-2" data-testid="progress-compliance" />
              </CardContent>
            </Card>

            <Card data-testid="card-metric-total-units">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" data-testid="icon-total-units" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-units">
                  {summary?.totalUnits || 0}
                </div>
                <p className="text-xs text-muted-foreground" data-testid="text-units-breakdown">
                  {summary?.qualifiedUnits || 0} qualified ({qualifiedPercentage}%)
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/tax-credits/projects/new">
              <Button variant="outline" className="w-full h-auto py-4 px-4" data-testid="button-start-project">
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">Start New Project</span>
                </div>
              </Button>
            </Link>
            <Link href="/tax-credits/documents/upload">
              <Button variant="outline" className="w-full h-auto py-4 px-4" data-testid="button-upload-results">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload Test Results</span>
                </div>
              </Button>
            </Link>
            <Link href="/tax-credits/compliance">
              <Button variant="outline" className="w-full h-auto py-4 px-4" data-testid="button-check-requirements">
                <div className="flex flex-col items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="text-sm">Check Requirements</span>
                </div>
              </Button>
            </Link>
            <Link href="/tax-credits/reports">
              <Button variant="outline" className="w-full h-auto py-4 px-4" data-testid="button-generate-package">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Generate Package</span>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Projects Overview */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">Active Projects</TabsTrigger>
          <TabsTrigger value="year" data-testid="tab-year">By Tax Year</TabsTrigger>
          <TabsTrigger value="builder" data-testid="tab-builder">By Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4" data-testid="content-active">
          {/* Error State for Recent Projects */}
          {recentError && (
            <Alert variant="destructive" data-testid="alert-error-recent">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Failed to load recent projects. Please try again.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchRecent()}
                  data-testid="button-retry-recent"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card data-testid="card-recent-projects">
            <CardHeader>
              <CardTitle data-testid="text-recent-projects-title">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLoading ? (
                <div className="space-y-4" data-testid="skeleton-recent-projects">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : recentProjects?.data?.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-recent-projects">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4" data-testid="text-no-projects">No tax credit projects yet</p>
                  <Link href="/tax-credits/projects/new">
                    <Button data-testid="button-create-first-project">Create Your First Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4" data-testid="list-recent-projects">
                  {recentProjects?.data?.map((project) => (
                    <Link key={project.id} href={`/tax-credits/projects/${project.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-muted rounded-lg" data-testid={`icon-type-${project.id}`}>
                            {getProjectTypeIcon(project.projectType)}
                          </div>
                          <div>
                            <div className="font-medium" data-testid={`text-name-${project.id}`}>{project.projectName}</div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-info-${project.id}`}>
                              {project.totalUnits} units • Tax Year {project.taxYear}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium" data-testid={`text-amount-${project.id}`}>
                              {formatCurrency(parseFloat(project.creditAmount || '0'))}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid={`text-qualified-${project.id}`}>
                              {project.qualifiedUnits}/{project.totalUnits} qualified
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(project.status)} text-white`} data-testid={`badge-status-${project.id}`}>
                            {project.status}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="year" className="space-y-4" data-testid="content-year">
          {/* Error State for Projects by Year */}
          {projectsError && (
            <Alert variant="destructive" data-testid="alert-error-projects">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Failed to load projects for {selectedYear}. Please try again.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchProjects()}
                  data-testid="button-retry-projects"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card data-testid="card-year-projects">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle data-testid="text-year-projects-title">Projects by Tax Year</CardTitle>
              <div className="flex gap-2" data-testid="group-year-filters">
                {[2023, 2024, 2025].map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedYear(year)}
                    data-testid={`button-year-${year}`}
                  >
                    {year}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-4" data-testid="skeleton-year-projects">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : projects?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground" data-testid="empty-year-projects">
                  No projects for tax year {selectedYear}
                </div>
              ) : (
                <div className="space-y-4" data-testid="list-year-projects">
                  {projects?.map((project) => (
                    <div key={project.id} className="flex items-center justify-between" data-testid={`item-year-project-${project.id}`}>
                      <div>
                        <div className="font-medium" data-testid={`text-year-name-${project.id}`}>{project.projectName}</div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-year-units-${project.id}`}>
                          {project.qualifiedUnits} qualified units
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium" data-testid={`text-year-amount-${project.id}`}>
                          {formatCurrency(parseFloat(project.creditAmount || '0'))}
                        </div>
                        <Badge variant="outline" className={getStatusColor(project.status)} data-testid={`badge-year-status-${project.id}`}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4" data-testid="section-year-total">
                    <div className="flex justify-between font-medium">
                      <span data-testid="text-year-total-label">Total for {selectedYear}:</span>
                      <span data-testid={`text-year-total-${selectedYear}`}>
                        {formatCurrency(yearTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4" data-testid="content-builder">
          <Card data-testid="card-builder-projects">
            <CardHeader>
              <CardTitle data-testid="text-builder-projects-title">Projects by Builder</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-4" data-testid="skeleton-builder-projects">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : summary?.projectsByBuilder && Object.keys(summary.projectsByBuilder).length > 0 ? (
                <div className="space-y-4" data-testid="list-builder-projects">
                  {Object.entries(summary.projectsByBuilder).map(([builderId, count]) => (
                    <div key={builderId} className="flex items-center justify-between" data-testid={`item-builder-${builderId}`}>
                      <div>
                        <div className="font-medium" data-testid={`text-builder-name-${builderId}`}>Builder {builderId}</div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-builder-count-${builderId}`}>
                          {count} {count === 1 ? 'project' : 'projects'}
                        </div>
                      </div>
                      <Link href={`/tax-credits/projects?builderId=${builderId}`}>
                        <Button variant="outline" size="sm" data-testid={`button-builder-view-${builderId}`}>View Projects</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground" data-testid="empty-builder-projects">
                  No builder data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts and Reminders */}
      <Card data-testid="card-reminders">
        <CardHeader>
          <CardTitle data-testid="text-reminders-title">Important Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-reminders">
          <Alert data-testid="alert-irs-requirements">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>IRS Requirements:</strong> All units must achieve 50% energy savings or HERS Index ≤ 55 to qualify for the $2,500 credit.
            </AlertDescription>
          </Alert>
          
          <Alert data-testid="alert-documentation-deadline">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Documentation Deadline:</strong> Ensure all test results and certifications are submitted before the tax filing deadline.
            </AlertDescription>
          </Alert>
          
          <Alert data-testid="alert-required-tests">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Required Tests:</strong> Each unit needs blower door test (ACH50) and duct leakage test (CFM25) results.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaxCredit45L() {
  return (
    <ErrorBoundary>
      <TaxCredit45LContent />
    </ErrorBoundary>
  );
}