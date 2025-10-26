import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { TaxCreditProject } from "@shared/schema";

export default function TaxCredit45L() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/tax-credit-summary"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<TaxCreditProject[]>({
    queryKey: [`/api/tax-credit-projects/year/${selectedYear}`],
  });

  const { data: recentProjects, isLoading: recentLoading } = useQuery<{ data: TaxCreditProject[], total: number }>({
    queryKey: ["/api/tax-credit-projects", { limit: 5 }],
  });

  const isLoading = summaryLoading || projectsLoading || recentLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
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

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'single-family':
        return <Home className="h-4 w-4" />;
      case 'multifamily':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potential Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-credits">
              {isLoading ? "..." : formatCurrency(summary?.totalPotentialCredits || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.qualifiedUnits || 0} qualified units × $2,500
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-projects">
              {isLoading ? "..." : summary?.totalProjects || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.pendingProjects || 0} pending, {summary?.certifiedProjects || 0} certified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-compliance-rate">
              {isLoading ? "..." : `${Math.round(summary?.complianceRate || 0)}%`}
            </div>
            <Progress value={summary?.complianceRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-units">
              {isLoading ? "..." : summary?.totalUnits || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.qualifiedUnits || 0} qualified ({Math.round((summary?.qualifiedUnits || 0) / Math.max(summary?.totalUnits || 1, 1) * 100)}%)
            </p>
          </CardContent>
        </Card>
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

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading projects...</div>
              ) : recentProjects?.data?.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No tax credit projects yet</p>
                  <Link href="/tax-credits/projects/new">
                    <Button>Create Your First Project</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentProjects?.data?.map((project) => (
                    <Link key={project.id} href={`/tax-credits/projects/${project.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer" data-testid={`card-project-${project.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-muted rounded-lg">
                            {getProjectTypeIcon(project.projectType)}
                          </div>
                          <div>
                            <div className="font-medium">{project.projectName}</div>
                            <div className="text-sm text-muted-foreground">
                              {project.totalUnits} units • Tax Year {project.taxYear}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {formatCurrency(parseFloat(project.creditAmount || '0'))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {project.qualifiedUnits}/{project.totalUnits} qualified
                            </div>
                          </div>
                          <Badge className={`${getStatusColor(project.status)} text-white`}>
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

        <TabsContent value="year" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Projects by Tax Year</CardTitle>
              <div className="flex gap-2">
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
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading projects...</div>
              ) : projects?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No projects for tax year {selectedYear}
                </div>
              ) : (
                <div className="space-y-4">
                  {projects?.map((project) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{project.projectName}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.qualifiedUnits} qualified units
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(parseFloat(project.creditAmount || '0'))}
                        </div>
                        <Badge variant="outline" className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total for {selectedYear}:</span>
                      <span data-testid={`text-year-total-${selectedYear}`}>
                        {formatCurrency(projects?.reduce((sum, p) => sum + parseFloat(p.creditAmount || '0'), 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projects by Builder</CardTitle>
            </CardHeader>
            <CardContent>
              {summary?.projectsByBuilder && Object.keys(summary.projectsByBuilder).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(summary.projectsByBuilder).map(([builderId, count]) => (
                    <div key={builderId} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Builder {builderId}</div>
                        <div className="text-sm text-muted-foreground">
                          {count} {count === 1 ? 'project' : 'projects'}
                        </div>
                      </div>
                      <Link href={`/tax-credits/projects?builderId=${builderId}`}>
                        <Button variant="outline" size="sm">View Projects</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No builder data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts and Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Important Reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>IRS Requirements:</strong> All units must achieve 50% energy savings or HERS Index ≤ 55 to qualify for the $2,500 credit.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Documentation Deadline:</strong> Ensure all test results and certifications are submitted before the tax filing deadline.
            </AlertDescription>
          </Alert>
          
          <Alert>
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