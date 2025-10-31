import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMileageLogSchema, type InsertMileageLog, type MileageLog } from "@shared/schema";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Car,
  Plus,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Download,
  Trash,
  Edit,
  Copy,
  TrendingUp,
  Gauge,
  Navigation,
  ArrowRight,
  ListTodo,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { TripController } from "@/components/mileage/TripController";

const IRS_RATE = 0.70; // 2025 IRS standard mileage rate

function MileageContent() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MileageLog | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  });

  const form = useForm<InsertMileageLog>({
    resolver: zodResolver(insertMileageLogSchema),
    defaultValues: {
      date: new Date(),
      startOdometer: 0,
      endOdometer: 0,
      distance: "0",
      purpose: "business",
      startLocation: "",
      endLocation: "",
      notes: "",
      jobId: undefined,
      rate: IRS_RATE,
    },
  });

  // Watch for odometer changes to auto-calculate distance
  const startOdometer = form.watch("startOdometer");
  const endOdometer = form.watch("endOdometer");

  // Auto-calculate distance when odometers change (using useEffect for proper optimization)
  // This effect watches the start and end odometer readings and automatically calculates
  // the distance traveled. It only updates the form value if:
  // 1. Both odometer readings are present
  // 2. End odometer is greater than start (prevents negative distances)
  // 3. The calculated distance differs from the current form value (prevents infinite loops)
  useEffect(() => {
    if (startOdometer && endOdometer) {
      const startNum = parseFloat(startOdometer.toString());
      const endNum = parseFloat(endOdometer.toString());
      
      if (!isNaN(startNum) && !isNaN(endNum) && endNum > startNum) {
        const calculatedDistance = endNum - startNum;
        const currentDistance = form.getValues("distance");
        // Only update if the calculated value differs from current value to prevent re-render cycles
        if (currentDistance !== calculatedDistance.toString()) {
          form.setValue("distance", calculatedDistance.toString());
        }
      } else if (!isNaN(startNum) && !isNaN(endNum) && endNum <= startNum) {
        // Clear distance when end odometer is less than or equal to start
        form.setValue("distance", "");
      }
    }
  }, [startOdometer, endOdometer, form]);

  // Fetch mileage logs for the selected date range
  // Uses hierarchical query key for proper cache invalidation
  // Retries 2 times on failure for resilience against network issues
  const { data: logs, isLoading, error: logsError } = useQuery({
    queryKey: ["/api/mileage-logs", dateRange],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({
        startDate: (queryKey[1] as any).startDate.toISOString(),
        endDate: (queryKey[1] as any).endDate.toISOString(),
      });
      const response = await fetch(`/api/mileage-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch mileage logs");
      return response.json();
    },
    retry: 2, // Retry failed requests twice before showing error
  });

  // Fetch jobs for linking trips to specific jobs
  // Provides dropdown options in the trip creation/edit dialog
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["/api/jobs"],
    retry: 2, // Retry for resilience
  });

  // Fetch unclassified drives count
  const { data: unclassifiedDrives } = useQuery({
    queryKey: ["/api/mileage/unclassified"],
  });

  // Fetch last mileage log for "same as last" feature
  const { data: lastLog } = useQuery({
    queryKey: ["/api/mileage-logs", { limit: 1 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "1" });
      const response = await fetch(`/api/mileage-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch last log");
      const data = await response.json();
      return data[0];
    },
  });

  // Fetch monthly summary from API
  const { data: monthlySummary, isLoading: isSummaryLoading, error: summaryError } = useQuery({
    queryKey: ['/api/mileage/summary', dateRange],
    queryFn: async ({ queryKey }) => {
      const range = queryKey[1] as { startDate: Date; endDate: Date };
      const month = format(range.startDate, 'yyyy-MM');
      const response = await fetch(`/api/mileage/summary?month=${month}`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json() as Promise<{
        month: string;
        totalDrives: number;
        businessDrives: number;
        personalDrives: number;
        totalMiles: number;
        businessMiles: number;
        personalMiles: number;
        taxDeduction: number;
        irsRate: number;
      }>;
    },
  });

  // Create mileage log mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertMileageLog) => {
      return apiRequest("/api/mileage-logs", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mileage/summary"] });
      toast({
        title: "Success",
        description: "Mileage log added successfully",
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mileage log mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertMileageLog> }) => {
      return apiRequest(`/api/mileage-logs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mileage/summary"] });
      toast({
        title: "Success",
        description: "Mileage log updated",
      });
      setShowAddDialog(false);
      setSelectedLog(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mileage log mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/mileage-logs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mileage-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mileage/summary"] });
      toast({
        title: "Success",
        description: "Mileage log deleted",
      });
      setDeleteDialogOpen(false);
      setLogToDelete(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      // CRITICAL: Keep dialog open on error for inline retry
      setDeleteError(error.message);
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Memoized formatters for performance optimization
  // Cache the Intl.NumberFormat instances themselves to avoid recreating them on every call
  // This provides significant performance improvement when formatting many numbers
  const currencyFormatter = useMemo(() => 
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }),
  []);

  const numberFormatter = useMemo(() => 
    new Intl.NumberFormat("en-US"),
  []);

  // Memoized formatting functions that reuse the cached formatter instances
  const formatCurrency = useCallback((amount: number) => 
    currencyFormatter.format(amount),
  [currencyFormatter]);

  const formatNumber = useCallback((num: number) => 
    numberFormatter.format(num),
  [numberFormatter]);

  // Handler functions wrapped in useCallback for performance
  const onSubmit = useCallback((data: InsertMileageLog) => {
    // CRITICAL: Validate odometer readings before submission
    if (data.startOdometer && data.endOdometer) {
      const startNum = parseFloat(data.startOdometer.toString());
      const endNum = parseFloat(data.endOdometer.toString());
      
      if (!isNaN(startNum) && !isNaN(endNum) && endNum <= startNum) {
        toast({
          title: "Invalid Odometer Reading",
          description: "End odometer must be greater than start odometer",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Validate distance is positive
    const distance = parseFloat(data.distance || "0");
    if (distance <= 0) {
      toast({
        title: "Invalid Distance",
        description: "Distance must be greater than zero",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedLog) {
      updateMutation.mutate({ id: selectedLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [selectedLog, createMutation, updateMutation, toast]);

  const useSameAsLast = useCallback(() => {
    if (lastLog) {
      form.setValue("startLocation", lastLog.startLocation);
      form.setValue("endLocation", lastLog.endLocation);
      form.setValue("purpose", lastLog.purpose);
      form.setValue("jobId", lastLog.jobId);
      form.setValue("notes", lastLog.notes);
      form.setValue("startOdometer", lastLog.endOdometer);
      toast({
        title: "Loaded",
        description: "Used details from last trip",
      });
    }
  }, [lastLog, form, toast]);

  const exportReport = useCallback(() => {
    const month = format(dateRange.startDate, 'yyyy-MM');
    const url = `/api/mileage/export?month=${month}&format=csv`;
    window.location.href = url;
    toast({
      title: "Exporting",
      description: "Your mileage report is being downloaded",
    });
  }, [dateRange, toast]);

  const handleDelete = useCallback((logId: string) => {
    setLogToDelete(logId);
    setDeleteError(null); // Clear any previous errors
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (logToDelete) {
      setDeleteError(null); // Clear error before retrying
      deleteMutation.mutate(logToDelete);
    }
  }, [logToDelete, deleteMutation]);

  // Check if form should be disabled during mutations
  // This prevents double-submission and provides clear feedback that an operation is in progress
  const isFormDisabled = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-title">Mileage Tracking</h1>
            <p className="text-muted-foreground">Track business mileage for tax deductions</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={exportReport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Report
            </Button>
            <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-mileage">
              <Plus className="h-4 w-4 mr-1" />
              Log Mileage
            </Button>
          </div>
        </div>

        {/* GPS Trip Controller */}
        <TripController />

        {/* Unclassified Drives Alert */}
        {unclassifiedDrives && unclassifiedDrives.length > 0 && (
          <Link href="/mileage/classify">
            <Alert className="cursor-pointer hover-elevate" data-testid="alert-unclassified-drives">
              <ListTodo className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  You have <strong>{unclassifiedDrives.length}</strong> {unclassifiedDrives.length === 1 ? 'drive' : 'drives'} to classify
                </span>
                <ArrowRight className="h-4 w-4" />
              </AlertDescription>
            </Alert>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isSummaryLoading ? (
            <>
              <Skeleton className="h-24" data-testid="skeleton-total-miles" />
              <Skeleton className="h-24" data-testid="skeleton-business-miles" />
              <Skeleton className="h-24" data-testid="skeleton-deduction" />
              <Skeleton className="h-24" data-testid="skeleton-irs-rate" />
            </>
          ) : summaryError ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Miles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">Failed to load</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] })}
                    className="mt-2"
                    data-testid="button-retry-summary"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Business Miles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">Failed to load</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] })}
                    className="mt-2"
                    data-testid="button-retry-summary"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tax Deduction</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">Failed to load</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] })}
                    className="mt-2"
                    data-testid="button-retry-summary"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">IRS Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive">Failed to load</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] })}
                    className="mt-2"
                    data-testid="button-retry-summary"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Miles</p>
                      <p className="text-2xl font-bold" data-testid="text-total-miles">
                        {formatNumber(monthlySummary?.totalMiles || 0)}
                      </p>
                    </div>
                    <Gauge className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Miles</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-business-miles">
                        {formatNumber(monthlySummary?.businessMiles || 0)}
                      </p>
                    </div>
                    <Car className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Deduction</p>
                      <p className="text-2xl font-bold text-blue-600" data-testid="text-deduction">
                        {formatCurrency(monthlySummary?.taxDeduction || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">IRS Rate</p>
                      <p className="text-2xl font-bold" data-testid="text-irs-rate">
                        ${IRS_RATE}/mile
                      </p>
                      <p className="text-xs text-muted-foreground">2025 Rate</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Mileage Logs</TabsTrigger>
            <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mileage History</CardTitle>
                <CardDescription>Your logged trips and mileage</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3" data-testid="skeleton-trip-table">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                ) : logsError ? (
                  <div className="text-center py-12" data-testid="error-logs">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                    <p className="text-lg font-semibold mb-2">Failed to load mileage logs</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Could not retrieve your trip history
                    </p>
                    <Button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage-logs'] })}
                      data-testid="button-retry-logs"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : logs?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Miles</TableHead>
                          <TableHead>Deduction</TableHead>
                          <TableHead>Job</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log: MileageLog) => (
                          <TableRow key={log.id} data-testid={`mileage-row-${log.id}`}>
                            <TableCell>
                              {format(new Date(log.date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm truncate">{log.startLocation}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-sm truncate">{log.endLocation}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={log.purpose === "business" ? "default" : "secondary"}
                              >
                                {log.purpose}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.distance} mi
                            </TableCell>
                            <TableCell className="font-semibold">
                              {log.purpose === "business" ? 
                                formatCurrency(log.distance * log.rate) : 
                                "-"
                              }
                            </TableCell>
                            <TableCell>
                              {log.jobId ? (
                                <Link href={`/jobs/${log.jobId}`}>
                                  <Button variant="link" size="sm" className="p-0">
                                    Job #{log.jobId}
                                  </Button>
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLog(log);
                                    form.reset({
                                      ...log,
                                      date: new Date(log.date),
                                    });
                                    setShowAddDialog(true);
                                  }}
                                  data-testid={`button-edit-${log.id}`}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(log.id)}
                                  disabled={deleteMutation.isPending && logToDelete === log.id}
                                  data-testid={`button-delete-${log.id}`}
                                >
                                  {deleteMutation.isPending && logToDelete === log.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                  ) : (
                                    <Trash className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Car className="h-12 w-12 mx-auto mb-4" />
                    <p>No mileage logs found</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowAddDialog(true)}
                      data-testid="button-create-first"
                    >
                      Log your first trip
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
                <CardDescription>
                  Mileage breakdown for {format(dateRange.startDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSummaryLoading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-48" />
                  </div>
                ) : summaryError ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                    <p className="text-lg font-semibold mb-2">Failed to load summary</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Could not retrieve monthly statistics
                    </p>
                    <Button
                      onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/mileage/summary'] })}
                      data-testid="button-retry-monthly-summary"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border" data-testid="summary-total-drives">
                        <p className="text-sm text-muted-foreground mb-1">Total Drives</p>
                        <p className="text-2xl font-bold">{monthlySummary?.totalDrives || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Business: {monthlySummary?.businessDrives || 0} | Personal: {monthlySummary?.personalDrives || 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border" data-testid="summary-average-trip">
                        <p className="text-sm text-muted-foreground mb-1">Average Trip</p>
                        <p className="text-2xl font-bold">
                          {monthlySummary?.totalDrives 
                            ? Math.round(monthlySummary.totalMiles / monthlySummary.totalDrives) 
                            : 0} mi
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border" data-testid="summary-business-percentage">
                        <p className="text-sm text-muted-foreground mb-1">Business %</p>
                        <p className="text-2xl font-bold">
                          {monthlySummary?.totalMiles 
                            ? Math.round((monthlySummary.businessMiles / monthlySummary.totalMiles) * 100) 
                            : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Drive Comparison */}
                    <div className="p-4 rounded-lg border" data-testid="summary-drive-comparison">
                      <h4 className="font-semibold mb-3">Drive Breakdown</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Business Drives</p>
                          <p className="text-xl font-bold text-green-600">
                            {monthlySummary?.businessDrives || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(monthlySummary?.businessMiles || 0)} miles
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Personal Drives</p>
                          <p className="text-xl font-bold">
                            {monthlySummary?.personalDrives || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(monthlySummary?.personalMiles || 0)} miles
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* IRS Compliance Box */}
                    <div className="p-6 rounded-lg bg-muted" data-testid="summary-irs-compliance">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        IRS Compliance Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Business Miles:</span>
                          <span className="font-medium" data-testid="summary-irs-business-miles">
                            {formatNumber(monthlySummary?.businessMiles || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IRS Standard Rate:</span>
                          <span className="font-medium" data-testid="summary-irs-rate">
                            ${monthlySummary?.irsRate || IRS_RATE} per mile
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Deduction:</span>
                          <span className="font-semibold text-lg" data-testid="summary-irs-deduction">
                            {formatCurrency(monthlySummary?.taxDeduction || 0)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        This mileage log meets IRS requirements for business mileage deduction.
                        Keep receipts and records for audit purposes.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Mileage Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedLog ? "Edit Mileage Log" : "Log Mileage"}
            </DialogTitle>
            <DialogDescription>
              Enter trip details for tax deduction tracking
            </DialogDescription>
          </DialogHeader>

          {lastLog && !selectedLog && (
            <Button
              variant="outline"
              onClick={useSameAsLast}
              className="w-full"
              data-testid="button-same-as-last"
            >
              <Copy className="h-4 w-4 mr-2" />
              Same as last trip ({lastLog.startLocation} → {lastLog.endLocation})
            </Button>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          disabled={isFormDisabled}
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Purpose</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                          disabled={isFormDisabled}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="business" id="business" disabled={isFormDisabled} />
                            <Label htmlFor="business">Business</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="personal" id="personal" disabled={isFormDisabled} />
                            <Label htmlFor="personal">Personal</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, City"
                          {...field}
                          disabled={isFormDisabled}
                          data-testid="input-start-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="456 Oak Ave, City"
                          {...field}
                          disabled={isFormDisabled}
                          data-testid="input-end-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="startOdometer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Odometer</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          disabled={isFormDisabled}
                          data-testid="input-start-odometer"
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endOdometer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Odometer</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          disabled={isFormDisabled}
                          data-testid="input-end-odometer"
                        />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (miles)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={isFormDisabled}
                          data-testid="input-distance"
                        />
                      </FormControl>
                      <FormDescription>Auto-calculated</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="jobId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Job (Optional)</FormLabel>
                    {jobsLoading ? (
                      <Skeleton className="h-10 w-full" data-testid="skeleton-job-select" />
                    ) : jobsError ? (
                      <div className="p-2 border rounded-md bg-destructive/10 text-sm text-destructive">
                        Failed to load jobs
                      </div>
                    ) : (
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isFormDisabled}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-job">
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Job</SelectItem>
                          {jobs?.map((job: any) => (
                            <SelectItem key={job.id} value={job.id}>
                              {job.address} - {job.builderName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Purpose of trip, client visited, etc."
                        {...field}
                        disabled={isFormDisabled}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("purpose") === "business" && (
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium mb-1">Estimated Deduction</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(parseFloat(form.watch("distance") || "0") * IRS_RATE)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {form.watch("distance") || "0"} miles × ${IRS_RATE}/mile
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddDialog(false);
                    setSelectedLog(null);
                    form.reset();
                  }}
                  disabled={isFormDisabled}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isFormDisabled}
                  data-testid="button-submit-mileage"
                >
                  {isFormDisabled ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    selectedLog ? "Update Log" : "Save Log"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setLogToDelete(null);
          setDeleteError(null);
        }
      }}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mileage Log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this mileage log from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Error message inline in dialog */}
          {deleteError && (
            <Alert variant="destructive" data-testid="alert-delete-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Delete failed:</strong> {deleteError}
              </AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setLogToDelete(null);
                setDeleteError(null);
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={(e) => {
                  e.preventDefault(); // Prevent default close
                  confirmDelete();    // Execute mutation
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : deleteError ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Delete
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Mileage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Failed to load Mileage</h2>
          <p className="text-muted-foreground">Something went wrong loading the page.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      }
    >
      <MileageContent />
    </ErrorBoundary>
  );
}