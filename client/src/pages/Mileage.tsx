import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMileageLogSchema, type InsertMileageLog, type MileageLog } from "@shared/schema";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Link } from "wouter";
import { TripController } from "@/components/mileage/TripController";

const IRS_RATE = 0.67; // 2024 IRS standard mileage rate

export default function Mileage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MileageLog | null>(null);
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

  // Auto-calculate distance when odometers change
  if (startOdometer && endOdometer && endOdometer > startOdometer) {
    const calculatedDistance = endOdometer - startOdometer;
    if (form.getValues("distance") !== calculatedDistance.toString()) {
      form.setValue("distance", calculatedDistance.toString());
    }
  }

  // Fetch mileage logs
  const { data: logs, isLoading } = useQuery({
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
  });

  // Fetch jobs for linking
  const { data: jobs } = useQuery({
    queryKey: ["/api/jobs"],
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
      toast({
        title: "Success",
        description: "Mileage log updated",
      });
      setShowAddDialog(false);
      setSelectedLog(null);
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
      toast({
        title: "Success",
        description: "Mileage log deleted",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Calculate statistics
  const stats = {
    totalMiles: logs?.reduce((sum: number, log: MileageLog) => sum + log.distance, 0) || 0,
    businessMiles: logs?.filter((log: MileageLog) => log.purpose === "business")
      .reduce((sum: number, log: MileageLog) => sum + log.distance, 0) || 0,
    personalMiles: logs?.filter((log: MileageLog) => log.purpose === "personal")
      .reduce((sum: number, log: MileageLog) => sum + log.distance, 0) || 0,
    totalDeduction: 0,
  };
  stats.totalDeduction = stats.businessMiles * IRS_RATE;

  const onSubmit = (data: InsertMileageLog) => {
    if (selectedLog) {
      updateMutation.mutate({ id: selectedLog.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const useSameAsLast = () => {
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
  };

  const exportReport = () => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      format: "csv",
    });
    window.location.href = `/api/mileage-logs/export?${params}`;
    toast({
      title: "Exporting",
      description: "Your mileage report is being downloaded",
    });
  };

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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Miles</p>
                  <p className="text-2xl font-bold" data-testid="text-total-miles">
                    {formatNumber(stats.totalMiles)}
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
                    {formatNumber(stats.businessMiles)}
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
                    {formatCurrency(stats.totalDeduction)}
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
                  <p className="text-xs text-muted-foreground">2024 Rate</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
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
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
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
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(log.id)}
                                  data-testid={`button-delete-${log.id}`}
                                >
                                  <Trash className="h-4 w-4 text-red-500" />
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
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Total Trips</p>
                      <p className="text-2xl font-bold">{logs?.length || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Average Trip</p>
                      <p className="text-2xl font-bold">
                        {logs?.length ? Math.round(stats.totalMiles / logs.length) : 0} mi
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Business %</p>
                      <p className="text-2xl font-bold">
                        {stats.totalMiles ? Math.round((stats.businessMiles / stats.totalMiles) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  {/* IRS Compliance Box */}
                  <div className="p-6 rounded-lg bg-muted">
                    <h4 className="font-semibold mb-3 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      IRS Compliance Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Business Miles:</span>
                        <span className="font-medium">{formatNumber(stats.businessMiles)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IRS Standard Rate:</span>
                        <span className="font-medium">${IRS_RATE} per mile</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Deduction:</span>
                        <span className="font-semibold text-lg">
                          {formatCurrency(stats.totalDeduction)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      This mileage log meets IRS requirements for business mileage deduction.
                      Keep receipts and records for audit purposes.
                    </p>
                  </div>
                </div>
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
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="business" id="business" />
                            <Label htmlFor="business">Business</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="personal" id="personal" />
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 
                    "Saving..." : 
                    selectedLog ? "Update Log" : "Save Log"
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}