import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DragDropContext, Droppable, Draggable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Settings, Plus, GripVertical, Edit2, Trash2, Bell,
  TrendingUp, Target, BarChart3, DollarSign, CheckCircle,
  AlertCircle, Mail, MessageSquare, Calculator, Eye, EyeOff,
  RefreshCw, Palette, Layout, Save, Activity
} from "lucide-react";

interface KPI {
  id: string;
  name: string;
  description: string;
  formula?: string;
  unit: string;
  category: string;
  target?: number;
  threshold?: {
    min?: number;
    max?: number;
    alert: boolean;
  };
  display: {
    enabled: boolean;
    order: number;
    color: string;
    icon?: string;
    showTrend: boolean;
    showTarget: boolean;
  };
  refreshRate: number; // in seconds
}

const PREDEFINED_KPIS: KPI[] = [
  {
    id: "jobs_completed",
    name: "Jobs Completed",
    description: "Total number of completed inspections",
    unit: "jobs",
    category: "Performance",
    display: {
      enabled: true,
      order: 1,
      color: "primary",
      icon: "CheckCircle",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 60,
  },
  {
    id: "avg_qa_score",
    name: "Average QA Score",
    description: "Mean quality assurance score across all inspections",
    unit: "%",
    category: "Quality",
    display: {
      enabled: true,
      order: 2,
      color: "success",
      icon: "TrendingUp",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 300,
  },
  {
    id: "revenue_month",
    name: "Monthly Revenue",
    description: "Total revenue for current month",
    unit: "$",
    category: "Financial",
    display: {
      enabled: true,
      order: 3,
      color: "warning",
      icon: "DollarSign",
      showTrend: true,
      showTarget: false,
    },
    refreshRate: 3600,
  },
  {
    id: "compliance_rate",
    name: "Compliance Rate",
    description: "Percentage of jobs meeting compliance standards",
    unit: "%",
    category: "Compliance",
    display: {
      enabled: true,
      order: 4,
      color: "info",
      icon: "CheckCircle",
      showTrend: false,
      showTarget: true,
    },
    refreshRate: 1800,
  },
  {
    id: "active_builders",
    name: "Active Builders",
    description: "Number of builders with jobs this month",
    unit: "builders",
    category: "Business",
    display: {
      enabled: true,
      order: 5,
      color: "secondary",
      icon: "Users",
      showTrend: true,
      showTarget: false,
    },
    refreshRate: 3600,
  },
  {
    id: "avg_inspection_time",
    name: "Avg Inspection Time",
    description: "Average time to complete an inspection",
    unit: "min",
    category: "Performance",
    target: 120,
    display: {
      enabled: false,
      order: 6,
      color: "primary",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 600,
  },
  {
    id: "first_pass_rate",
    name: "First Pass Rate",
    description: "Percentage of inspections passing on first attempt",
    unit: "%",
    category: "Quality",
    target: 85,
    threshold: {
      min: 70,
      alert: true,
    },
    display: {
      enabled: false,
      order: 7,
      color: "success",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 1800,
  },
  {
    id: "equipment_utilization",
    name: "Equipment Utilization",
    description: "Percentage of equipment in use",
    unit: "%",
    category: "Operations",
    display: {
      enabled: false,
      order: 8,
      color: "info",
      showTrend: false,
      showTarget: false,
    },
    refreshRate: 3600,
  },
  {
    id: "forecast_accuracy",
    name: "Forecast Accuracy",
    description: "Accuracy of TDL/DLO predictions",
    unit: "%",
    category: "Analytics",
    target: 90,
    display: {
      enabled: false,
      order: 9,
      color: "primary",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 7200,
  },
  {
    id: "customer_satisfaction",
    name: "Customer Satisfaction",
    description: "Average customer satisfaction rating",
    unit: "stars",
    category: "Quality",
    target: 4.5,
    display: {
      enabled: false,
      order: 10,
      color: "warning",
      showTrend: true,
      showTarget: true,
    },
    refreshRate: 86400,
  },
];

const KPI_CATEGORIES = [
  "Performance",
  "Quality",
  "Financial",
  "Compliance",
  "Business",
  "Operations",
  "Analytics",
];

const REFRESH_RATES = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
  { value: 7200, label: "2 hours" },
  { value: 86400, label: "Daily" },
];

export default function KPISettings() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<KPI[]>(PREDEFINED_KPIS);
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null);
  const [customKpiDialog, setCustomKpiDialog] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    emailEnabled: false,
    smsEnabled: false,
    inAppEnabled: true,
    emailAddresses: "",
    phoneNumbers: "",
  });

  const [newKpi, setNewKpi] = useState<Partial<KPI>>({
    name: "",
    description: "",
    formula: "",
    unit: "",
    category: "Performance",
    target: undefined,
    display: {
      enabled: false,
      order: kpis.length + 1,
      color: "primary",
      showTrend: true,
      showTarget: false,
    },
    refreshRate: 300,
  });

  const handleKpiToggle = (kpiId: string) => {
    setKpis(prev => prev.map(kpi => 
      kpi.id === kpiId 
        ? { ...kpi, display: { ...kpi.display, enabled: !kpi.display.enabled } }
        : kpi
    ));
  };

  const handleKpiEdit = (kpi: KPI) => {
    setSelectedKpi(kpi);
  };

  const handleKpiUpdate = (updates: Partial<KPI>) => {
    if (!selectedKpi) return;
    
    setKpis(prev => prev.map(kpi => 
      kpi.id === selectedKpi.id 
        ? { ...kpi, ...updates }
        : kpi
    ));
    
    toast({
      title: "KPI updated",
      description: `"${selectedKpi.name}" has been updated successfully`,
    });
  };

  const handleKpiReorder = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(kpis);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const reorderedKpis = items.map((kpi, index) => ({
      ...kpi,
      display: { ...kpi.display, order: index + 1 },
    }));
    
    setKpis(reorderedKpis);
  };

  const handleCreateCustomKpi = () => {
    if (!newKpi.name || !newKpi.unit) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const customKpi: KPI = {
      id: `custom_${Date.now()}`,
      name: newKpi.name,
      description: newKpi.description || "",
      formula: newKpi.formula,
      unit: newKpi.unit,
      category: newKpi.category || "Custom",
      target: newKpi.target,
      display: newKpi.display || {
        enabled: false,
        order: kpis.length + 1,
        color: "primary",
        showTrend: true,
        showTarget: false,
      },
      refreshRate: newKpi.refreshRate || 300,
    };

    setKpis(prev => [...prev, customKpi]);
    setCustomKpiDialog(false);
    setNewKpi({
      name: "",
      description: "",
      formula: "",
      unit: "",
      category: "Performance",
      target: undefined,
      display: {
        enabled: false,
        order: kpis.length + 1,
        color: "primary",
        showTrend: true,
        showTarget: false,
      },
      refreshRate: 300,
    });

    toast({
      title: "Custom KPI created",
      description: `"${customKpi.name}" has been added successfully`,
    });
  };

  const handleSaveSettings = () => {
    // Save to backend
    toast({
      title: "Settings saved",
      description: "Your KPI configuration has been saved successfully",
    });
  };

  const enabledKpis = kpis.filter(kpi => kpi.display.enabled).sort((a, b) => a.display.order - b.display.order);
  const disabledKpis = kpis.filter(kpi => !kpi.display.enabled);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">KPI Configuration</h1>
            <p className="text-muted-foreground">Customize your dashboard metrics and alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={customKpiDialog} onOpenChange={setCustomKpiDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom KPI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Custom KPI</DialogTitle>
                  <DialogDescription>
                    Define a custom key performance indicator
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="kpi-name">KPI Name *</Label>
                    <Input
                      id="kpi-name"
                      value={newKpi.name}
                      onChange={(e) => setNewKpi(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Inspection Efficiency"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kpi-description">Description</Label>
                    <Textarea
                      id="kpi-description"
                      value={newKpi.description}
                      onChange={(e) => setNewKpi(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of what this KPI measures"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kpi-formula">Formula (Optional)</Label>
                    <Textarea
                      id="kpi-formula"
                      value={newKpi.formula}
                      onChange={(e) => setNewKpi(prev => ({ ...prev, formula: e.target.value }))}
                      placeholder="e.g., (completed_jobs / total_jobs) * 100"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="kpi-unit">Unit *</Label>
                      <Input
                        id="kpi-unit"
                        value={newKpi.unit}
                        onChange={(e) => setNewKpi(prev => ({ ...prev, unit: e.target.value }))}
                        placeholder="e.g., %, $, jobs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="kpi-category">Category</Label>
                      <Select
                        value={newKpi.category}
                        onValueChange={(value) => setNewKpi(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger id="kpi-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KPI_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="kpi-target">Target Value (Optional)</Label>
                    <Input
                      id="kpi-target"
                      type="number"
                      value={newKpi.target || ""}
                      onChange={(e) => setNewKpi(prev => ({ 
                        ...prev, 
                        target: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      placeholder="Target value for this KPI"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCustomKpiDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCustomKpi}>Create KPI</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSaveSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">
              <Layout className="h-4 w-4 mr-2" />
              Dashboard Layout
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts & Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Active KPIs */}
              <Card>
                <CardHeader>
                  <CardTitle>Active KPIs</CardTitle>
                  <CardDescription>
                    KPIs currently displayed on your dashboard (drag to reorder)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {enabledKpis.length > 0 ? (
                        enabledKpis.map((kpi, index) => (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-2 p-3 rounded-md border bg-card hover-elevate"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{kpi.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {kpi.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {kpi.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleKpiEdit(kpi)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleKpiToggle(kpi.id)}
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No active KPIs</p>
                          <p className="text-xs mt-1">Enable KPIs from the available list</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Available KPIs */}
              <Card>
                <CardHeader>
                  <CardTitle>Available KPIs</CardTitle>
                  <CardDescription>
                    KPIs that can be added to your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {disabledKpis.length > 0 ? (
                        disabledKpis.map((kpi) => (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-2 p-3 rounded-md border opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{kpi.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {kpi.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {kpi.description}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleKpiToggle(kpi.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-success" />
                          <p className="text-sm">All KPIs are active</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* KPI Details */}
            {selectedKpi && (
              <Card>
                <CardHeader>
                  <CardTitle>Edit KPI: {selectedKpi.name}</CardTitle>
                  <CardDescription>
                    Configure display settings and thresholds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        value={selectedKpi.target || ""}
                        onChange={(e) => handleKpiUpdate({ 
                          target: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="Set target value"
                      />
                    </div>
                    <div>
                      <Label>Refresh Rate</Label>
                      <Select
                        value={selectedKpi.refreshRate.toString()}
                        onValueChange={(value) => handleKpiUpdate({ refreshRate: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REFRESH_RATES.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value.toString()}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-trend">Show Trend Indicator</Label>
                      <Switch
                        id="show-trend"
                        checked={selectedKpi.display.showTrend}
                        onCheckedChange={(checked) => handleKpiUpdate({
                          display: { ...selectedKpi.display, showTrend: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-target">Show Target Line</Label>
                      <Switch
                        id="show-target"
                        checked={selectedKpi.display.showTarget}
                        onCheckedChange={(checked) => handleKpiUpdate({
                          display: { ...selectedKpi.display, showTarget: checked }
                        })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Alert Thresholds</Label>
                    <div className="grid gap-4 md:grid-cols-2 mt-2">
                      <div>
                        <Label className="text-xs">Minimum Value</Label>
                        <Input
                          type="number"
                          placeholder="Alert when below"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Maximum Value</Label>
                        <Input
                          type="number"
                          placeholder="Alert when above"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>
                  Configure how you receive KPI alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-alerts">Email Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts via email
                      </p>
                    </div>
                    <Switch
                      id="email-alerts"
                      checked={alertSettings.emailEnabled}
                      onCheckedChange={(checked) => setAlertSettings(prev => ({
                        ...prev,
                        emailEnabled: checked
                      }))}
                    />
                  </div>
                  {alertSettings.emailEnabled && (
                    <div className="pl-8">
                      <Label htmlFor="email-addresses">Email Addresses</Label>
                      <Input
                        id="email-addresses"
                        value={alertSettings.emailAddresses}
                        onChange={(e) => setAlertSettings(prev => ({
                          ...prev,
                          emailAddresses: e.target.value
                        }))}
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-alerts">SMS Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts via text message
                      </p>
                    </div>
                    <Switch
                      id="sms-alerts"
                      checked={alertSettings.smsEnabled}
                      onCheckedChange={(checked) => setAlertSettings(prev => ({
                        ...prev,
                        smsEnabled: checked
                      }))}
                    />
                  </div>
                  {alertSettings.smsEnabled && (
                    <div className="pl-8">
                      <Label htmlFor="phone-numbers">Phone Numbers</Label>
                      <Input
                        id="phone-numbers"
                        value={alertSettings.phoneNumbers}
                        onChange={(e) => setAlertSettings(prev => ({
                          ...prev,
                          phoneNumbers: e.target.value
                        }))}
                        placeholder="+1234567890, +0987654321"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="in-app-alerts">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show alerts within the application
                    </p>
                  </div>
                  <Switch
                    id="in-app-alerts"
                    checked={alertSettings.inAppEnabled}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({
                      ...prev,
                      inAppEnabled: checked
                    }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Preferences</CardTitle>
                <CardDescription>
                  Customize when and how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Alert Frequency</Label>
                  <Select defaultValue="immediate">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Summary</SelectItem>
                      <SelectItem value="weekly">Weekly Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quiet Hours</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs">From</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div>
                      <Label className="text-xs">To</Label>
                      <Input type="time" defaultValue="07:00" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alert Types</Label>
                  <div className="space-y-2">
                    {["Critical", "Warning", "Info", "Success"].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox id={`alert-${type}`} defaultChecked={type !== "Info"} />
                        <label
                          htmlFor={`alert-${type}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type} Alerts
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Appearance</CardTitle>
                <CardDescription>
                  Customize how KPIs are displayed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Color Theme</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {["primary", "success", "warning", "info"].map((color) => (
                      <Button
                        key={color}
                        variant="outline"
                        className={cn(
                          "h-20",
                          color === "primary" && "border-primary",
                          color === "success" && "border-success",
                          color === "warning" && "border-warning",
                          color === "info" && "border-info"
                        )}
                      >
                        <div className="text-xs capitalize">{color}</div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Card Size</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Animation Speed</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      defaultValue={[50]}
                      max={100}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">50%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-animations">Enable Animations</Label>
                    <Switch id="show-animations" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-sparklines">Show Sparklines</Label>
                    <Switch id="show-sparklines" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <Switch id="compact-mode" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}