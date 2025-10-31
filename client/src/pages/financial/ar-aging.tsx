import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArSnapshot, Invoice, Builder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";
import { AlertCircle, RefreshCw, Download, FileText, DollarSign } from "lucide-react";
import { safeParseFloat } from "@shared/numberUtils";

// Phase 3 - OPTIMIZE: Module-level constants for aging bucket thresholds
// Phase 6 - DOCUMENT: AR Aging bucket definitions (industry standard)
// Current (0-30 days): Invoices due within 30 days or recently issued
// 31-60 days: Invoices 31-60 days old (early collection priority)
// 61-90 days: Invoices 61-90 days old (medium collection priority)
// 90+ days: Invoices over 90 days old (high collection priority)
const AGING_THRESHOLDS = {
  CURRENT_MAX: 30,      // 0-30 days
  THIRTY_DAY_MAX: 60,   // 31-60 days
  SIXTY_DAY_MAX: 90,    // 61-90 days
  // 90+ days has no max
} as const;

type BucketType = "current" | "30days" | "60days" | "90plus";

// Phase 2 - BUILD: ARAgingContent wrapped in ErrorBoundary at export
function ARAgingContent() {
  const [, setLocation] = useLocation();
  const [selectedBuilder, setSelectedBuilder] = useState<string>("all");

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  const { 
    data: arSnapshots = [], 
    isLoading: arLoading,
    error: arError,
    refetch: refetchAR
  } = useQuery<ArSnapshot[]>({
    queryKey: ["/api/ar/aging"],
    retry: 2,
  });

  const { 
    data: invoices = [], 
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
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

  // Phase 3 - OPTIMIZE: Memoized currency formatter to prevent recreation
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  // Phase 6 - DOCUMENT: AR aging bucket categorization logic
  // Determines which aging bucket an invoice belongs to based on days since invoice date
  // Phase 3 - OPTIMIZE: useCallback prevents function recreation
  const categorizeInvoice = useCallback((invoice: Invoice): BucketType => {
    // Phase 5 - HARDEN: Paid invoices always go to current bucket
    if (invoice.status === "paid") return "current";
    
    const today = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    
    // Phase 5 - HARDEN: Validate date is not NaN
    if (isNaN(invoiceDate.getTime())) return "current";
    
    const daysOverdue = differenceInDays(today, invoiceDate);

    // Phase 6 - DOCUMENT: Bucket assignment based on aging thresholds
    if (daysOverdue <= AGING_THRESHOLDS.CURRENT_MAX) return "current";
    if (daysOverdue <= AGING_THRESHOLDS.THIRTY_DAY_MAX) return "30days";
    if (daysOverdue <= AGING_THRESHOLDS.SIXTY_DAY_MAX) return "60days";
    return "90plus";
  }, []);

  // Phase 3 - OPTIMIZE: Memoized function to get days overdue
  const getDaysOverdue = useCallback((invoice: Invoice): number => {
    if (invoice.status === "paid") return 0;
    const today = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    
    // Phase 5 - HARDEN: Validate date
    if (isNaN(invoiceDate.getTime())) return 0;
    
    return Math.max(0, differenceInDays(today, invoiceDate));
  }, []);

  // Phase 3 - OPTIMIZE: Memoized builder lookup function
  const getBuilderName = useCallback((builderId: string) => {
    const builder = builders.find(b => b.id === builderId);
    return builder?.companyName || "Unknown Builder";
  }, [builders]);

  // Phase 3 - OPTIMIZE: Memoized filtered snapshots
  const filteredSnapshots = useMemo(() => {
    return selectedBuilder === "all" 
      ? arSnapshots 
      : arSnapshots.filter(snap => snap.builderId === selectedBuilder);
  }, [selectedBuilder, arSnapshots]);

  // Phase 6 - DOCUMENT: AR aging totals calculation
  // Aggregates all AR snapshots to compute total receivables by bucket
  // Phase 3 - OPTIMIZE: Memoized to prevent recalculation on every render
  const totals = useMemo(() => {
    return filteredSnapshots.reduce(
      (acc, snap) => ({
        current: acc.current + safeParseFloat(snap.current),
        days30: acc.days30 + safeParseFloat(snap.days30),
        days60: acc.days60 + safeParseFloat(snap.days60),
        days90Plus: acc.days90Plus + safeParseFloat(snap.days90Plus),
        totalAR: acc.totalAR + safeParseFloat(snap.totalAR),
      }),
      { current: 0, days30: 0, days60: 0, days90Plus: 0, totalAR: 0 }
    );
  }, [filteredSnapshots]);

  // Phase 6 - DOCUMENT: Chart data for AR aging visualization
  // Transforms bucket totals into recharts-compatible format
  // Phase 3 - OPTIMIZE: Memoized chart data
  const chartData = useMemo(() => [
    {
      name: "Current",
      amount: totals.current,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "30 Days",
      amount: totals.days30,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "60 Days",
      amount: totals.days60,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "90+ Days",
      amount: totals.days90Plus,
      fill: "hsl(var(--chart-4))",
    },
  ], [totals]);

  // Phase 3 - OPTIMIZE: Memoized unpaid invoices filter
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== "paid");
  }, [invoices]);

  // Phase 6 - DOCUMENT: Invoice categorization by aging bucket
  // Groups unpaid invoices into aging buckets for detailed drill-down
  // Phase 3 - OPTIMIZE: Memoized bucket categorization
  const invoicesByBucket = useMemo(() => ({
    current: unpaidInvoices.filter(inv => categorizeInvoice(inv) === "current"),
    "30days": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "30days"),
    "60days": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "60days"),
    "90plus": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "90plus"),
  }), [unpaidInvoices, categorizeInvoice]);

  // Phase 3 - OPTIMIZE: useCallback for event handlers
  const handleInvoiceClick = useCallback((invoiceId: string) => {
    setLocation(`/financial/invoices?id=${invoiceId}`);
  }, [setLocation]);

  const handleBuilderChange = useCallback((value: string) => {
    setSelectedBuilder(value);
  }, []);

  const handleRetryAR = useCallback(() => {
    refetchAR();
  }, [refetchAR]);

  const handleRetryInvoices = useCallback(() => {
    refetchInvoices();
  }, [refetchInvoices]);

  const handleRetryBuilders = useCallback(() => {
    refetchBuilders();
  }, [refetchBuilders]);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
  }, []);

  return (
    <div className="h-full overflow-auto" data-testid="page-ar-aging">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-title">AR Aging Report</h1>
            <p className="text-muted-foreground">Track outstanding receivables by aging period</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Builder Filter */}
            <div className="w-64">
              <Select value={selectedBuilder} onValueChange={handleBuilderChange}>
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

            {/* Export Button */}
            <Button 
              variant="outline" 
              onClick={handleExport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Phase 2 - BUILD: Per-query error state with retry for builders */}
        {buildersError && (
          <Alert variant="destructive" data-testid="alert-builders-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load builders</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch builder data. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryBuilders}
                data-testid="button-retry-builders"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Phase 2 - BUILD: Per-query error state with retry for AR data */}
        {arError && (
          <Alert variant="destructive" data-testid="alert-ar-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load AR aging data</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch AR aging snapshots. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryAR}
                data-testid="button-retry-ar"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* AR Aging Buckets Display */}
        <Card data-testid="card-aging-breakdown">
          <CardHeader>
            <CardTitle>
              <DollarSign className="inline h-5 w-5 mr-2" />
              Aging Breakdown
            </CardTitle>
            <CardDescription>Outstanding receivables by aging period</CardDescription>
          </CardHeader>
          <CardContent>
            {arLoading ? (
              // Phase 2 - BUILD: Skeleton loader for AR aging data
              <div className="space-y-6" data-testid="skeleton-ar-aging">
                <div className="text-center">
                  <Skeleton className="h-4 w-48 mx-auto mb-2" />
                  <Skeleton className="h-12 w-64 mx-auto" />
                </div>
                <Skeleton className="h-[300px] w-full" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            ) : totals.totalAR === 0 ? (
              // Phase 2 - BUILD: Empty state when no outstanding receivables
              <div className="text-center py-12" data-testid="empty-ar">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Outstanding Receivables</h3>
                <p className="text-muted-foreground">
                  All invoices have been paid. Great job!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Total AR Amount */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Total Accounts Receivable</div>
                  <div className="text-4xl font-bold" data-testid="text-total-ar">
                    {formatCurrency(totals.totalAR)}
                  </div>
                </div>

                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="Amount" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Bucket Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg" data-testid="bucket-current">
                    <div className="text-sm text-muted-foreground mb-1">Current (0-30 days)</div>
                    <div className="text-2xl font-bold" data-testid="bucket-current-amount">
                      {formatCurrency(totals.current)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {invoicesByBucket.current.length} invoice(s)
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg" data-testid="bucket-30days">
                    <div className="text-sm text-muted-foreground mb-1">31-60 Days</div>
                    <div className="text-2xl font-bold" data-testid="bucket-30days-amount">
                      {formatCurrency(totals.days30)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {invoicesByBucket["30days"].length} invoice(s)
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg" data-testid="bucket-60days">
                    <div className="text-sm text-muted-foreground mb-1">61-90 Days</div>
                    <div className="text-2xl font-bold" data-testid="bucket-60days-amount">
                      {formatCurrency(totals.days60)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {invoicesByBucket["60days"].length} invoice(s)
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg border-destructive/50" data-testid="bucket-90plus">
                    <div className="text-sm text-muted-foreground mb-1">90+ Days</div>
                    <div className="text-2xl font-bold text-destructive" data-testid="bucket-90plus-amount">
                      {formatCurrency(totals.days90Plus)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {invoicesByBucket["90plus"].length} invoice(s)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase 2 - BUILD: Per-query error state with retry for invoices */}
        {invoicesError && (
          <Alert variant="destructive" data-testid="alert-invoices-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load invoices</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to fetch invoice data. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetryInvoices}
                data-testid="button-retry-invoices"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Invoice List by Bucket */}
        <Card data-testid="card-invoices-by-bucket">
          <CardHeader>
            <CardTitle>
              <FileText className="inline h-5 w-5 mr-2" />
              Invoices by Aging Period
            </CardTitle>
            <CardDescription>Detailed invoice breakdown by bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="current" data-testid="tab-current">
                  Current ({invoicesByBucket.current.length})
                </TabsTrigger>
                <TabsTrigger value="30days" data-testid="tab-30days">
                  30 Days ({invoicesByBucket["30days"].length})
                </TabsTrigger>
                <TabsTrigger value="60days" data-testid="tab-60days">
                  60 Days ({invoicesByBucket["60days"].length})
                </TabsTrigger>
                <TabsTrigger value="90plus" data-testid="tab-90plus">
                  90+ Days ({invoicesByBucket["90plus"].length})
                </TabsTrigger>
              </TabsList>

              {(["current", "30days", "60days", "90plus"] as BucketType[]).map((bucket) => (
                <TabsContent key={bucket} value={bucket}>
                  {invoicesLoading ? (
                    // Phase 2 - BUILD: Skeleton loader for invoice tables
                    <div className="space-y-2" data-testid={`skeleton-invoices-${bucket}`}>
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : invoicesByBucket[bucket].length === 0 ? (
                    // Phase 2 - BUILD: Empty state for each bucket
                    <div className="text-center py-8" data-testid={`empty-invoices-${bucket}`}>
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No invoices in this bucket</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Builder</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Balance Due</TableHead>
                            <TableHead>Days Overdue</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoicesByBucket[bucket].map((invoice) => {
                            const daysOverdue = getDaysOverdue(invoice);
                            return (
                              <TableRow 
                                key={invoice.id} 
                                className="cursor-pointer hover-elevate"
                                onClick={() => handleInvoiceClick(invoice.id)}
                                data-testid={`row-invoice-${invoice.id}`}
                              >
                                <TableCell className="font-medium" data-testid={`cell-invoice-number-${invoice.id}`}>
                                  {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell data-testid={`cell-builder-${invoice.id}`}>
                                  {getBuilderName(invoice.builderId)}
                                </TableCell>
                                <TableCell data-testid={`cell-invoice-date-${invoice.id}`}>
                                  {format(new Date(invoice.periodEnd), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell data-testid={`cell-amount-${invoice.id}`}>
                                  {formatCurrency(safeParseFloat(invoice.total))}
                                </TableCell>
                                <TableCell className="font-semibold" data-testid={`cell-balance-${invoice.id}`}>
                                  {formatCurrency(safeParseFloat(invoice.total))}
                                </TableCell>
                                <TableCell data-testid={`cell-days-overdue-${invoice.id}`}>
                                  {daysOverdue > 0 ? `${daysOverdue} days` : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default" data-testid={`badge-status-${invoice.id}`}>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Phase 2 - BUILD: Wrap component in ErrorBoundary with fallback UI
export default function ARAgingReport() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center min-h-[400px]" data-testid="error-boundary-fallback">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading AR Aging Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                An unexpected error occurred while loading the AR Aging Report. 
                Please refresh the page to try again.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                data-testid="button-reload-page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ARAgingContent />
    </ErrorBoundary>
  );
}
