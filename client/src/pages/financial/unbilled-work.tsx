import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Job, Builder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

export default function UnbilledWorkTracker() {
  const [, setLocation] = useLocation();
  const [selectedBuilder, setSelectedBuilder] = useState<string>("all");
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Query for unbilled summary
  const { data: unbilledSummary, isLoading: summaryLoading } = useQuery<{ count: number; amount: number }>({
    queryKey: ["/api/ar/unbilled"],
  });

  // Query for all jobs
  const { data: allJobs = [], isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  // Filter for completed unbilled jobs
  const unbilledJobs = allJobs.filter(job => {
    const isCompleted = job.status === "completed" || job.fieldWorkComplete;
    const isUnbilled = !job.billedInInvoiceId;
    const hasBuilder = selectedBuilder === "all" || job.builderId === selectedBuilder;
    return isCompleted && isUnbilled && hasBuilder;
  });

  // Group jobs by type for subtotals
  const jobsByType = unbilledJobs.reduce((acc, job) => {
    const type = job.inspectionType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Get builder name by ID
  const getBuilderName = (builderId: string | null) => {
    if (!builderId) return "Unknown";
    const builder = builders.find(b => b.id === builderId);
    return builder?.companyName || "Unknown Builder";
  };

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  // Toggle all jobs in view
  const toggleAllJobs = () => {
    if (selectedJobs.size === unbilledJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(unbilledJobs.map(j => j.id)));
    }
  };

  // Navigate to invoice creation with selected jobs
  const handleCreateInvoice = () => {
    const jobIds = Array.from(selectedJobs).join(',');
    setLocation(`/financial/invoices?jobIds=${jobIds}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate totals for selected jobs
  const selectedTotal = unbilledJobs
    .filter(job => selectedJobs.has(job.id))
    .reduce((sum, job) => sum + (parseFloat(job.pricing || "0")), 0);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Unbilled Work</h1>
            <p className="text-muted-foreground">Track completed jobs not yet invoiced</p>
          </div>

          {/* Builder Filter */}
          <div className="w-64">
            <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
              <SelectTrigger data-testid="select-builder-filter">
                <SelectValue placeholder="Filter by builder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-builder-all">All Builders</SelectItem>
                {buildersLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unbilled Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-unbilled-count">
                {summaryLoading ? "..." : unbilledSummary?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed jobs awaiting invoice
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unbilled Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-unbilled-amount">
                {summaryLoading ? "..." : formatCurrency(unbilledSummary?.amount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue to be invoiced
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Unbilled Jobs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Unbilled Jobs</CardTitle>
                <CardDescription>
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
              <div className="text-center py-12 text-muted-foreground" data-testid="text-loading">
                Loading jobs...
              </div>
            ) : unbilledJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-jobs">
                No unbilled jobs found
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(jobsByType).map(([jobType, jobs]) => {
                  const typeTotal = jobs.reduce((sum, job) => sum + (parseFloat(job.pricing || "0")), 0);
                  
                  return (
                    <div key={jobType} className="space-y-2">
                      {/* Job Type Header with Subtotal */}
                      <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" data-testid={`badge-job-type-${jobType}`}>
                            {jobType.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({jobs.length} {jobs.length === 1 ? 'job' : 'jobs'})
                          </span>
                        </div>
                        <div className="font-semibold" data-testid={`text-subtotal-${jobType}`}>
                          {formatCurrency(typeTotal)}
                        </div>
                      </div>

                      {/* Jobs Table for this Type */}
                      <div className="overflow-x-auto">
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
                              <TableHead>Job #</TableHead>
                              <TableHead>Address</TableHead>
                              <TableHead>Builder</TableHead>
                              <TableHead>Completion Date</TableHead>
                              <TableHead>Value</TableHead>
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
