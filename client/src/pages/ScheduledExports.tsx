import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Trash2, Play, Power, PowerOff, Clock, Mail, FileText, CheckCircle2, XCircle, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { insertScheduledExportSchema, updateScheduledExportSchema, type ScheduledExport } from "@shared/schema";
import { format } from "date-fns";

// Extended form schema with validation
const formSchema = insertScheduledExportSchema.extend({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format (00:00 to 23:59)"),
  recipients: z.string().min(1, "At least one recipient is required").transform((val) => {
    try {
      const emails = val.split(',').map(e => e.trim()).filter(e => e);
      return emails;
    } catch {
      return [val];
    }
  }),
  dayOfWeek: z.coerce.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.coerce.number().min(1).max(31).optional().nullable(),
}).refine((data) => {
  if (data.frequency === 'weekly') {
    return data.dayOfWeek !== null && data.dayOfWeek !== undefined;
  }
  return true;
}, {
  message: "Day of week is required for weekly exports",
  path: ["dayOfWeek"],
}).refine((data) => {
  if (data.frequency === 'monthly') {
    return data.dayOfMonth !== null && data.dayOfMonth !== undefined;
  }
  return true;
}, {
  message: "Day of month is required for monthly exports",
  path: ["dayOfMonth"],
});

const editFormSchema = updateScheduledExportSchema.extend({
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:mm format (00:00 to 23:59)").optional(),
  recipients: z.string().optional().transform((val) => {
    if (!val) return undefined;
    try {
      const emails = val.split(',').map(e => e.trim()).filter(e => e);
      return emails;
    } catch {
      return [val];
    }
  }),
  dayOfWeek: z.coerce.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.coerce.number().min(1).max(31).optional().nullable(),
}).refine((data) => {
  if (data.frequency === 'weekly') {
    return data.dayOfWeek !== null && data.dayOfWeek !== undefined;
  }
  return true;
}, {
  message: "Day of week is required for weekly exports",
  path: ["dayOfWeek"],
}).refine((data) => {
  if (data.frequency === 'monthly') {
    return data.dayOfMonth !== null && data.dayOfMonth !== undefined;
  }
  return true;
}, {
  message: "Day of month is required for monthly exports",
  path: ["dayOfMonth"],
});

type FormValues = z.infer<typeof formSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

const DATA_TYPE_OPTIONS = [
  { value: "jobs", label: "Jobs" },
  { value: "financial", label: "Financial" },
  { value: "equipment", label: "Equipment" },
  { value: "qa-scores", label: "QA Scores" },
  { value: "analytics", label: "Analytics" },
  { value: "photos", label: "Photos" },
];

const FORMAT_OPTIONS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (XLSX)" },
  { value: "pdf", label: "PDF" },
  { value: "json", label: "JSON" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function ScheduledExports() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExport, setEditingExport] = useState<ScheduledExport | null>(null);
  const [deleteExportId, setDeleteExportId] = useState<string | null>(null);

  // Fetch scheduled exports
  const { data: exports, isLoading } = useQuery<ScheduledExport[]>({
    queryKey: ["/api/scheduled-exports"],
  });

  // Create form
  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dataType: "jobs",
      format: "csv",
      frequency: "daily",
      time: "09:00",
      recipients: "",
      enabled: true,
      dayOfWeek: null,
      dayOfMonth: null,
      options: null,
    },
  });

  // Edit form
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

  // Watch frequency to show/hide conditional fields
  const watchFrequency = createForm.watch("frequency");
  const watchEditFrequency = editForm.watch("frequency");

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/scheduled-exports", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exports"] });
      toast({
        title: "Export Created",
        description: "Scheduled export has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditFormValues }) => {
      const response = await apiRequest("PATCH", `/api/scheduled-exports/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exports"] });
      toast({
        title: "Export Updated",
        description: "Scheduled export has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingExport(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/scheduled-exports/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exports"] });
      toast({
        title: "Export Deleted",
        description: "Scheduled export has been deleted successfully.",
      });
      setDeleteExportId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enable mutation
  const enableMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/scheduled-exports/${id}/enable`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exports"] });
      toast({
        title: "Export Enabled",
        description: "Scheduled export has been enabled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable mutation
  const disableMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/scheduled-exports/${id}/disable`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exports"] });
      toast({
        title: "Export Disabled",
        description: "Scheduled export has been disabled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test run mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/scheduled-exports/${id}/test`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Export Started",
        description: "The export has been triggered. You will receive it via email shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = (data: FormValues) => {
    createMutation.mutate(data);
  };

  const handleEdit = (exportItem: ScheduledExport) => {
    setEditingExport(exportItem);
    editForm.reset({
      name: exportItem.name,
      dataType: exportItem.dataType,
      format: exportItem.format,
      frequency: exportItem.frequency,
      time: exportItem.time,
      recipients: Array.isArray(exportItem.recipients) ? exportItem.recipients.join(', ') : '',
      dayOfWeek: exportItem.dayOfWeek,
      dayOfMonth: exportItem.dayOfMonth,
      enabled: exportItem.enabled,
      options: exportItem.options ? JSON.stringify(exportItem.options, null, 2) : null,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (data: EditFormValues) => {
    if (!editingExport) return;
    updateMutation.mutate({ id: editingExport.id, data });
  };

  const handleToggleEnabled = (exportItem: ScheduledExport) => {
    if (exportItem.enabled) {
      disableMutation.mutate(exportItem.id);
    } else {
      enableMutation.mutate(exportItem.id);
    }
  };

  const formatNextRun = (nextRun: string | null) => {
    if (!nextRun) return "Not scheduled";
    try {
      return format(new Date(nextRun), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return "Never run";
    try {
      return format(new Date(lastRun), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Scheduled Exports</h1>
          <p className="text-sm text-muted-foreground">Manage automated data exports</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-export">
              <Plus className="w-4 h-4 mr-2" />
              Create Export
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Scheduled Export</DialogTitle>
              <DialogDescription>
                Set up a new automated export to receive data via email on a recurring schedule.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Export Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Weekly Jobs Report" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="dataType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-dataType">
                              <SelectValue placeholder="Select data type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DATA_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Format</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-format">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FORMAT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time (HH:mm)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="09:00" type="time" data-testid="input-time" />
                        </FormControl>
                        <FormDescription>24-hour format</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {watchFrequency === "weekly" && (
                  <FormField
                    control={createForm.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-dayOfWeek">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAY_OF_WEEK_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchFrequency === "monthly" && (
                  <FormField
                    control={createForm.control}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month (1-31)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min={1} 
                            max={31} 
                            placeholder="15" 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            data-testid="input-dayOfMonth" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={createForm.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipients (Email Addresses)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="user1@example.com, user2@example.com" data-testid="input-recipients" />
                      </FormControl>
                      <FormDescription>Comma-separated email addresses</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value ? (typeof field.value === 'string' ? field.value : JSON.stringify(field.value, null, 2)) : ''}
                          placeholder='{"dateRange": "last30days"}' 
                          rows={3}
                          data-testid="input-options" 
                        />
                      </FormControl>
                      <FormDescription>Optional filters and export settings as JSON</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Export</FormLabel>
                        <FormDescription>
                          Export will run automatically based on the schedule
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Export"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !exports || exports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center" data-testid="empty-state">
            <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Scheduled Exports</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automated export to start receiving data on a regular schedule.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Export
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="exports-grid">
            {exports.map((exportItem) => (
              <Card key={exportItem.id} data-testid={`card-export-${exportItem.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`text-name-${exportItem.id}`}>
                        {exportItem.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" data-testid={`badge-dataType-${exportItem.id}`}>
                            {DATA_TYPE_OPTIONS.find(o => o.value === exportItem.dataType)?.label}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-format-${exportItem.id}`}>
                            {FORMAT_OPTIONS.find(o => o.value === exportItem.format)?.label}
                          </Badge>
                          <Badge variant="outline" data-testid={`badge-frequency-${exportItem.id}`}>
                            {FREQUENCY_OPTIONS.find(o => o.value === exportItem.frequency)?.label}
                          </Badge>
                        </div>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={exportItem.enabled ? "default" : "secondary"}
                      data-testid={`badge-status-${exportItem.id}`}
                    >
                      {exportItem.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className="ml-1 font-medium" data-testid={`text-time-${exportItem.id}`}>
                      {exportItem.time}
                    </span>
                  </div>

                  {exportItem.frequency === 'weekly' && exportItem.dayOfWeek !== null && (
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Day:</span>
                      <span className="ml-1 font-medium" data-testid={`text-dayOfWeek-${exportItem.id}`}>
                        {DAY_OF_WEEK_OPTIONS.find(d => d.value === exportItem.dayOfWeek?.toString())?.label}
                      </span>
                    </div>
                  )}

                  {exportItem.frequency === 'monthly' && exportItem.dayOfMonth !== null && (
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Day of Month:</span>
                      <span className="ml-1 font-medium" data-testid={`text-dayOfMonth-${exportItem.id}`}>
                        {exportItem.dayOfMonth}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start text-sm">
                    <Mail className="w-4 h-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Recipients:</span>
                      <div className="mt-1 space-y-1">
                        {Array.isArray(exportItem.recipients) && exportItem.recipients.map((email, idx) => (
                          <div key={idx} className="text-xs" data-testid={`text-recipient-${exportItem.id}-${idx}`}>
                            {email}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Next run:</span>
                      <span className="ml-1 text-xs" data-testid={`text-nextRun-${exportItem.id}`}>
                        {formatNextRun(exportItem.nextRun)}
                      </span>
                    </div>
                    <div className="flex items-start text-sm">
                      <div className="flex items-center mr-2">
                        {exportItem.lastRun ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-muted-foreground">Last run:</span>
                      <span className="ml-1 text-xs" data-testid={`text-lastRun-${exportItem.id}`}>
                        {formatLastRun(exportItem.lastRun)}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(exportItem)}
                    data-testid={`button-edit-${exportItem.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleEnabled(exportItem)}
                    disabled={enableMutation.isPending || disableMutation.isPending}
                    data-testid={`button-toggle-${exportItem.id}`}
                  >
                    {exportItem.enabled ? (
                      <>
                        <PowerOff className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(exportItem.id)}
                    disabled={testMutation.isPending}
                    data-testid={`button-test-${exportItem.id}`}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteExportId(exportItem.id)}
                    data-testid={`button-delete-${exportItem.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Scheduled Export</DialogTitle>
            <DialogDescription>
              Update the configuration for this automated export.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Export Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Weekly Jobs Report" data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="dataType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-dataType">
                            <SelectValue placeholder="Select data type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DATA_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-format">
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FORMAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time (HH:mm)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="09:00" type="time" data-testid="input-edit-time" />
                      </FormControl>
                      <FormDescription>24-hour format</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchEditFrequency === "weekly" && (
                <FormField
                  control={editForm.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-dayOfWeek">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAY_OF_WEEK_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchEditFrequency === "monthly" && (
                <FormField
                  control={editForm.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Month (1-31)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min={1} 
                          max={31} 
                          placeholder="15"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          data-testid="input-edit-dayOfMonth" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={editForm.control}
                name="recipients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipients (Email Addresses)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="user1@example.com, user2@example.com" data-testid="input-edit-recipients" />
                    </FormControl>
                    <FormDescription>Comma-separated email addresses</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value ? (typeof field.value === 'string' ? field.value : JSON.stringify(field.value, null, 2)) : ''}
                        placeholder='{"dateRange": "last30days"}' 
                        rows={3}
                        data-testid="input-edit-options" 
                      />
                    </FormControl>
                    <FormDescription>Optional filters and export settings as JSON</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Export</FormLabel>
                      <FormDescription>
                        Export will run automatically based on the schedule
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Export"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteExportId} onOpenChange={() => setDeleteExportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Export?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The scheduled export will be permanently deleted and will no longer run automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteExportId && deleteMutation.mutate(deleteExportId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
