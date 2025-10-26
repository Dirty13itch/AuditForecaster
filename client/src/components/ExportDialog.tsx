import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Mail,
  Clock,
  Check,
  X,
  Loader2,
  ChevronRight,
  FileCheck,
} from "lucide-react";

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';
export type ExportDataType = 'jobs' | 'financial' | 'equipment' | 'qa-scores' | 'analytics' | 'photos';

interface ExportOptions {
  format: ExportFormat;
  dataType: ExportDataType;
  columns?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeHeaders?: boolean;
  fileName?: string;
  emailDelivery?: boolean;
  emailAddresses?: string[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
  };
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataType: ExportDataType;
  availableColumns: { key: string; label: string }[];
  currentFilters?: Record<string, any>;
  defaultFileName?: string;
  onExportComplete?: (result: any) => void;
}

const FORMAT_ICONS = {
  csv: FileText,
  xlsx: FileSpreadsheet,
  pdf: FileText,
  json: FileJson,
};

const FORMAT_NAMES = {
  csv: 'CSV',
  xlsx: 'Excel',
  pdf: 'PDF',
  json: 'JSON',
};

const DATA_TYPE_NAMES = {
  jobs: 'Jobs',
  financial: 'Financial Data',
  equipment: 'Equipment',
  'qa-scores': 'QA Scores',
  analytics: 'Analytics',
  photos: 'Photos',
};

export default function ExportDialog({
  open,
  onOpenChange,
  dataType,
  availableColumns,
  currentFilters,
  defaultFileName,
  onExportComplete,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("format");
  
  // Export options state
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.map(col => col.key)
  );
  const [useCurrentFilters, setUseCurrentFilters] = useState(true);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [customFileName, setCustomFileName] = useState(defaultFileName || '');
  const [emailDelivery, setEmailDelivery] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<string>('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  
  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const endpoint = dataType === 'financial' 
        ? '/api/export/financial'
        : dataType === 'qa-scores'
        ? '/api/export/qa-scores'
        : `/api/export/${dataType}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          format: options.format,
          dataType: dataType === 'financial' ? currentFilters?.dataType || 'invoices' : undefined,
          columns: options.columns,
          filters: useCurrentFilters ? currentFilters : options.filters,
          dateRange: options.dateRange ? {
            startDate: options.dateRange.startDate.toISOString(),
            endDate: options.dateRange.endDate.toISOString(),
          } : undefined,
          fileName: options.fileName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Handle file download
      const blob = await response.blob();
      const fileName = options.fileName || 
        response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `export-${Date.now()}.${options.format}`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { fileName, size: blob.size };
    },
    onSuccess: (result) => {
      toast({
        title: "Export successful",
        description: `File "${result.fileName}" has been downloaded`,
      });
      onExportComplete?.(result);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    const options: ExportOptions = {
      format: selectedFormat,
      dataType,
      columns: selectedColumns,
      filters: useCurrentFilters ? currentFilters : undefined,
      dateRange: dateRange.from && dateRange.to ? {
        startDate: dateRange.from,
        endDate: dateRange.to,
      } : undefined,
      fileName: customFileName || undefined,
      emailDelivery,
      emailAddresses: emailDelivery ? emailAddresses.split(',').map(e => e.trim()) : undefined,
      schedule: scheduleEnabled ? {
        enabled: true,
        frequency: scheduleFrequency,
        time: scheduleTime,
      } : undefined,
    };
    
    exportMutation.mutate(options);
  };

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(availableColumns.map(col => col.key));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export {DATA_TYPE_NAMES[dataType]}</DialogTitle>
          <DialogDescription>
            Configure your export options and download your data in the desired format.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['csv', 'xlsx', 'pdf', 'json'] as ExportFormat[]).map(format => {
                  const Icon = FORMAT_ICONS[format];
                  return (
                    <Button
                      key={format}
                      variant={selectedFormat === format ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setSelectedFormat(format)}
                      data-testid={`button-format-${format}`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {FORMAT_NAMES[format]}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filename">File Name (Optional)</Label>
              <Input
                id="filename"
                placeholder={`export-${dataType}-${format(new Date(), 'yyyy-MM-dd')}`}
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                data-testid="input-filename"
              />
            </div>
          </TabsContent>

          <TabsContent value="columns" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Columns to Export</Label>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllColumns}
                  data-testid="button-select-all-columns"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllColumns}
                  data-testid="button-deselect-all-columns"
                >
                  Deselect All
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-4">
              <div className="space-y-2">
                {availableColumns.map(column => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column.key}`}
                      checked={selectedColumns.includes(column.key)}
                      onCheckedChange={() => toggleColumn(column.key)}
                      data-testid={`checkbox-column-${column.key}`}
                    />
                    <Label
                      htmlFor={`column-${column.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <p className="text-sm text-muted-foreground">
              {selectedColumns.length} of {availableColumns.length} columns selected
            </p>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4">
            {currentFilters && Object.keys(currentFilters).length > 0 && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-current-filters"
                  checked={useCurrentFilters}
                  onCheckedChange={setUseCurrentFilters}
                  data-testid="switch-use-current-filters"
                />
                <Label htmlFor="use-current-filters">
                  Use current view filters
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                      data-testid="button-date-from"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                      data-testid="button-date-to"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-delivery"
                  checked={emailDelivery}
                  onCheckedChange={setEmailDelivery}
                  data-testid="switch-email-delivery"
                />
                <Label htmlFor="email-delivery">
                  Send export via email
                </Label>
              </div>

              {emailDelivery && (
                <div className="space-y-2">
                  <Label htmlFor="email-addresses">Email Addresses</Label>
                  <Input
                    id="email-addresses"
                    placeholder="email1@example.com, email2@example.com"
                    value={emailAddresses}
                    onChange={(e) => setEmailAddresses(e.target.value)}
                    data-testid="input-email-addresses"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="schedule-export"
                  checked={scheduleEnabled}
                  onCheckedChange={setScheduleEnabled}
                  data-testid="switch-schedule-export"
                />
                <Label htmlFor="schedule-export">
                  Schedule recurring export
                </Label>
              </div>

              {scheduleEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={scheduleFrequency} onValueChange={(value: any) => setScheduleFrequency(value)}>
                      <SelectTrigger id="frequency" data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily" data-testid="option-daily">Daily</SelectItem>
                        <SelectItem value="weekly" data-testid="option-weekly">Weekly</SelectItem>
                        <SelectItem value="monthly" data-testid="option-monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      data-testid="input-schedule-time"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            {exportMutation.isPending && (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing export...
              </>
            )}
          </div>
          
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exportMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || selectedColumns.length === 0}
              data-testid="button-export"
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}