import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Job, Builder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DollarSign, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

function UnbilledWorkTrackerContent() {
  const [, setLocation] = useLocation();
  const [selectedBuilder, setSelectedBuilder] = useState<string>("all");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Query for unbilled summary
  const { 
    data: unbilledSummary, 
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery<{ count: number; amount: number }>({
    queryKey: ["/api/ar/unbilled"],
    retry: 2,
  });

  // Query for all jobs
  const { 
    data: allJobs = [], 
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    retry: 2,
  });

  const { 
    data: builders = [], 
    isLoading: buildersLoading,
    error: buildersError,
    refetch: refetchBuilders
  } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
    retry: 2,
  });

  // Filter for completed unbilled jobs
  const unbilledJobs = useMemo(() => {
    return allJobs.filter(job => {
      const isCompleted = job.status === "completed" || job.fieldWorkComplete;
      const isUnbilled = !job.billedInInvoiceId;
      const hasBuilder = selectedBuilder === "all" || job.builderId === selectedBuilder;
      return isCompleted && isUnbilled && hasBuilder;
    });
  }, [allJobs, selectedBuilder]);

  // Group jobs by type for subtotals
  const jobsByType = useMemo(() => {
    return unbilledJobs.reduce((acc, job) => {
      const type = job.inspectionType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(job);
      return acc;
    }, {} as Record<string, Job[]>);
  }, [unbilledJobs]);

  // Get builder name by ID
  const getBuilderName = useCallback((builderId: string | null) => {
    if (!builderId) return "Unknown";
    const builder = builders.find(b => b.id === builderId);
    return builder?.companyName || "Unknown Builder";
  }, [builders]);

  // Toggle job selection
  const toggleJobSelection = useCallback((jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  }, [selectedJobs]);

  // Toggle all jobs in view
  const toggleAllJobs = useCallback(() => {
    if (selectedJobs.size === unbilledJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(unbilledJobs.map(j => j.id)));
    }
  }, [selectedJobs, unbilledJobs]);

  // Navigate to invoice creation with selected jobs
  const handleCreateInvoice = useCallback(() => {
    const jobIds = Array.from(selectedJobs).join(',');
    setLocation(`/financial/invoices?jobIds=${jobIds}`);
  }, [selectedJobs, setLocation]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Calculate totals for selected jobs
  const selectedTotal = useMemo(() => {
    return unbilledJobs
      .filter(job => selectedJobs.has(job.id))
      .reduce((sum, job) => sum + (parseFloat(job.pricing || "0")), 0);
  }, [unbilledJobs, selectedJobs]);

  return (
    <div className="h-full overflow-auto" data-testid="page-unbilled-work">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Unbilled Work</h1>
            <p className="text-muted-foreground" data-testid="text-page-subtitle">Track completed jobs not yet invoiced</p>
          </div>

          {/* Builder Filter */}
          <div className="w-64">
            <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
              <SelectTrigger data-testid="select-builder-filter">
                <SelectValue placeholder="Filter by builder" />
              </SelectTrigger>
              <SelectContent data-testid="select-builder-content">
                <SelectItem value="all" data-testid="select-builder-all">All Builders</SelectItem>
                {buildersLoading ? (
                  <SelectItem value="loading" disabled data-testid="select-builder-loading">Loading...</SelectItem>
                ) : (
                  builders.map((builder) => (
                    <SelectItem 
                      key={builder.id} 
                      value={builder.id}
                      data-testid={`select-builder-${builder.id}`}
                    >
                      {builder.companyName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error states */}
        {summaryError && (
          <Alert variant="destructive" data-testid="alert-summary-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Unbilled Summary</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch unbilled work summary. Please try again.</span>
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

        {jobsError && (
          <Alert variant="destructive" data-testid="alert-jobs-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Jobs</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch job data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => refetchJobs()}
                data-testid="button-retry-jobs"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {buildersError && (
          <Alert variant="destructive" data-testid="alert-builders-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Builders</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch builder data. Please try again.</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => refetchBuilders()}
                data-testid="button-retry-builders"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="grid-summary-cards">
          <Card data-testid="card-unbilled-count">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unbilled Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-16" data-testid="skeleton-unbilled-count" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-unbilled-count">
                  {unbilledSummary?.count || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-unbilled-count-description">
                Completed jobs awaiting invoice
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-unbilled-amount">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unbilled Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" data-testid="skeleton-unbilled-amount" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-unbilled-amount">
                  {formatCurrency(unbilledSummary?.amount || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground" data-testid="text-unbilled-amount-description">
                Revenue to be invoiced
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unbilled Jobs Table */}
        <Card data-testid="card-unbilled-jobs-table">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle data-testid="text-unbilled-jobs-title">Unbilled Jobs</CardTitle>
                <CardDescription data-testid="text-selection-summary">
                  {selectedJobs.size > 0 
                    ? `${selectedJobs.size} jobs selected (${formatCurrency(selectedTotal)})`
                    : "Select jobs to create an invoice"
                  }
                </CardDescription>
              </div>
              <Button
                onClick={handleCreateInvoice}
                disabled={selectedJobs.size === 0}
                data-testid="button-create-invoice"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Invoice ({selectedJobs.size})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3" data-testid="skeleton-jobs-list">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : unbilledJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-jobs">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No unbilled jobs found</p>
                <p className="text-xs mt-2">Completed jobs will appear here once they're ready to invoice</p>
              </div>
            ) : (
              <div className="space-y-6" data-testid="section-jobs-by-type">
                {Object.entries(jobsByType).map(([jobType, jobs]) => {
                  const typeTotal = jobs.reduce((sum, job) => sum + (parseFloat(job.pricing || "0")), 0);
                  
                  return (
                    <div key={jobType} className="space-y-2" data-testid={`group-job-type-${jobType}`}>
                      {/* Job Type Header with Subtotal */}
                      <div className="flex items-center justify-between bg-muted p-3 rounded-md" data-testid={`header-job-type-${jobType}`}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" data-testid={`badge-job-type-${jobType}`}>
                            {jobType.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground" data-testid={`text-job-count-${jobType}`}>
                            ({jobs.length} {jobs.length === 1 ? 'job' : 'jobs'})
                          </span>
                        </div>
                        <div className="font-semibold" data-testid={`text-subtotal-${jobType}`}>
                          {formatCurrency(typeTotal)}
                        </div>
                      </div>

                      {/* Jobs Table for this Type */}
                      <div className="overflow-x-auto" data-testid={`table-container-${jobType}`}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={jobs.every(job => selectedJobs.has(job.id))}
                                  onCheckedChange={() => {
                                    const allSelected = jobs.every(job => selectedJobs.has(job.id));
                                    const newSelected = new Set(selectedJobs);
                                    jobs.forEach(job => {
                                      if (allSelected) {
                                        newSelected.delete(job.id);
                                      } else {
                                        newSelected.add(job.id);
                                      }
                                    });
                                    setSelectedJobs(newSelected);
                                  }}
                                  data-testid={`checkbox-select-all-${jobType}`}
                                />
                              </TableHead>
                              <TableHead data-testid={`header-job-number-${jobType}`}>Job #</TableHead>
                              <TableHead data-testid={`header-address-${jobType}`}>Address</TableHead>
                              <TableHead data-testid={`header-builder-${jobType}`}>Builder</TableHead>
                              <TableHead data-testid={`header-completion-${jobType}`}>Completion Date</TableHead>
                              <TableHead data-testid={`header-value-${jobType}`}>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobs.map((job) => (
                              <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedJobs.has(job.id)}
                                    onCheckedChange={() => toggleJobSelection(job.id)}
                                    data-testid={`checkbox-job-${job.id}`}
                                  />
                                </TableCell>
                                <TableCell className="font-medium" data-testid={`cell-job-name-${job.id}`}>
                                  {job.name}
                                </TableCell>
                                <TableCell data-testid={`cell-address-${job.id}`}>
                                  {job.address}
                                </TableCell>
                                <TableCell data-testid={`cell-builder-${job.id}`}>
                                  {getBuilderName(job.builderId)}
                                </TableCell>
                                <TableCell data-testid={`cell-completion-date-${job.id}`}>
                                  {job.completedDate 
                                    ? format(new Date(job.completedDate), "MMM d, yyyy")
                                    : job.fieldWorkCompletedAt
                                    ? format(new Date(job.fieldWorkCompletedAt), "MMM d, yyyy")
                                    : "-"
                                  }
                                </TableCell>
                                <TableCell className="font-semibold" data-testid={`cell-value-${job.id}`}>
                                  {formatCurrency(parseFloat(job.pricing || "0"))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UnbilledWorkTracker() {
  return (
    <ErrorBoundary>
      <UnbilledWorkTrackerContent />
    </ErrorBoundary>
  );
}
