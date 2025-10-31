import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Clock,
  Package,
  Plus,
  Grid2X2,
  List,
  Search,
  QrCode,
  CheckCircle,
  AlertCircle,
  Wrench,
  Calendar,
  User,
  Wind,
  Camera,
  Gauge,
  Droplet,
  Thermometer,
  Eye,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import type { Equipment, EquipmentCalibration, EquipmentCheckout } from '@shared/schema';

// Phase 3 - OPTIMIZE: Memoized icon mapping using lucide-react icons instead of emoji
// This prevents recreation of the mapping object on every render and uses proper icons
const EQUIPMENT_TYPE_ICONS = {
  blower_door: Wind,
  duct_tester: Wrench,
  manometer: Gauge,
  camera: Camera,
  flow_hood: Wind,
  combustion_analyzer: Thermometer,
  infrared_camera: Eye,
  moisture_meter: Droplet,
  other: Settings,
} as const;

// Phase 3 - OPTIMIZE: Memoized status color mapping
// Prevents recreation on every render
const STATUS_COLORS = {
  available: 'bg-green-500/10 text-green-700 dark:text-green-400',
  in_use: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  maintenance: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  retired: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
} as const;

function EquipmentContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  // Phase 5 - HARDEN: Added retry: 2 for resilience against network issues
  // Fetch equipment with error handling and retry
  const { 
    data: equipment, 
    isLoading: loadingEquipment, 
    error: equipmentError,
    refetch: refetchEquipment 
  } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
    retry: 2, // Retry failed requests twice before showing error
  });

  // Phase 5 - HARDEN: Added retry: 2 for resilience
  // Fetch alerts with error handling and retry
  const { 
    data: alerts, 
    isLoading: loadingAlerts,
    error: alertsError,
    refetch: refetchAlerts
  } = useQuery<{
    calibrationDue: number;
    maintenanceDue: number;
    overdueCalibrations: number;
    overdueCheckouts: number;
    details: {
      calibrationDue: Equipment[];
      maintenanceDue: Equipment[];
      overdueCalibrations: EquipmentCalibration[];
      overdueCheckouts: EquipmentCheckout[];
    };
  }>({
    queryKey: ['/api/equipment/alerts'],
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoized filter logic to prevent recomputation on every render
  // Only recalculates when equipment data or filter values change
  const filteredEquipment = useMemo(() => {
    if (!equipment) return [];
    
    return equipment.filter((item) => {
      const matchesSearch = searchTerm === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [equipment, searchTerm, statusFilter, typeFilter]);

  // Phase 3 - OPTIMIZE: Memoized helper function using cached STATUS_COLORS object
  const getStatusColor = useCallback((status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.retired;
  }, []);

  // Phase 3 - OPTIMIZE: Memoized icon retriever using cached EQUIPMENT_TYPE_ICONS object
  // Returns the lucide icon component instead of emoji
  const getTypeIcon = useCallback((type: string) => {
    return EQUIPMENT_TYPE_ICONS[type as keyof typeof EQUIPMENT_TYPE_ICONS] || Settings;
  }, []);

  // Phase 5 - HARDEN: Calibration status calculation with proper date validation
  // Prevents invalid date operations and handles edge cases
  const getCalibrationStatus = useCallback((item: Equipment) => {
    if (!item.calibrationDue) return null;
    
    const now = new Date();
    const due = new Date(item.calibrationDue);
    
    // Validate date is not NaN
    if (isNaN(due.getTime())) return null;
    
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400" data-testid="badge-calibration-overdue">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" data-testid="badge-calibration-due">{`Due in ${daysUntilDue} days`}</Badge>;
    }
    return null;
  }, []);

  // Phase 3 - OPTIMIZE: Memoized event handlers to prevent recreation on every render
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const handleTypeFilterChange = useCallback((value: string) => {
    setTypeFilter(value);
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
  }, []);

  // Phase 5 - HARDEN: Retry handler for equipment query errors
  const handleRetryEquipment = useCallback(() => {
    refetchEquipment();
  }, [refetchEquipment]);

  // Phase 5 - HARDEN: Retry handler for alerts query errors
  const handleRetryAlerts = useCallback(() => {
    refetchAlerts();
  }, [refetchAlerts]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Equipment Management</h1>
          <p className="text-muted-foreground">Track and manage inspection equipment</p>
        </div>
        <Link href="/equipment/add">
          <Button data-testid="button-add-equipment">
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </Link>
      </div>

      {/* Phase 2 - BUILD: Skeleton loaders for alerts section during loading */}
      {loadingAlerts ? (
        <div className="mb-6 space-y-3" data-testid="skeleton-alerts">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : alertsError ? (
        // Phase 2 - BUILD: Error state with retry for alerts
        <Alert className="mb-6 border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-alerts">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-300">Failed to Load Alerts</AlertTitle>
          <AlertDescription className="text-red-800 dark:text-red-400 flex items-center justify-between">
            <span>Unable to fetch equipment alerts. Please try again.</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleRetryAlerts}
              data-testid="button-retry-alerts"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        // Alerts Section - only show if there are active alerts
        alerts && (alerts.calibrationDue > 0 || alerts.overdueCalibrations > 0 || alerts.overdueCheckouts > 0) && (
          <div className="mb-6 space-y-3" data-testid="container-alerts">
            {alerts.overdueCalibrations > 0 && (
              <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="alert-overdue-calibrations">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertTitle className="text-red-900 dark:text-red-300">Calibration Overdue</AlertTitle>
                <AlertDescription className="text-red-800 dark:text-red-400">
                  {alerts.overdueCalibrations} equipment items have overdue calibrations
                </AlertDescription>
              </Alert>
            )}
            {alerts.calibrationDue > 0 && (
              <Alert className="border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-900/10" data-testid="alert-calibration-due">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertTitle className="text-yellow-900 dark:text-yellow-300">Calibration Due Soon</AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                  {alerts.calibrationDue} equipment items need calibration within 7 days
                </AlertDescription>
              </Alert>
            )}
            {alerts.overdueCheckouts > 0 && (
              <Alert className="border-orange-600/20 bg-orange-50/50 dark:bg-orange-900/10" data-testid="alert-overdue-checkouts">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertTitle className="text-orange-900 dark:text-orange-300">Equipment Not Returned</AlertTitle>
                <AlertDescription className="text-orange-800 dark:text-orange-400">
                  {alerts.overdueCheckouts} equipment items were not returned on time
                </AlertDescription>
              </Alert>
            )}
          </div>
        )
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, serial, or model..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
              data-testid="input-search-equipment"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="blower_door">Blower Door</SelectItem>
              <SelectItem value="duct_tester">Duct Tester</SelectItem>
              <SelectItem value="manometer">Manometer</SelectItem>
              <SelectItem value="camera">Camera</SelectItem>
              <SelectItem value="flow_hood">Flow Hood</SelectItem>
              <SelectItem value="combustion_analyzer">Combustion Analyzer</SelectItem>
              <SelectItem value="infrared_camera">Infrared Camera</SelectItem>
              <SelectItem value="moisture_meter">Moisture Meter</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => handleViewModeChange('grid')}
              data-testid="button-view-grid"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => handleViewModeChange('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions Tabs */}
      <Tabs defaultValue="all" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">All Equipment</TabsTrigger>
          <TabsTrigger value="checkout" data-testid="tab-checkout">Check In/Out</TabsTrigger>
          <TabsTrigger value="calibration" data-testid="tab-calibration">Calibration</TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          {/* Phase 2 - BUILD: Skeleton loaders for equipment grid/list during loading */}
          {loadingEquipment ? (
            <div data-testid="skeleton-equipment-list">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded" />
                            <div>
                              <Skeleton className="h-4 w-48 mb-2" />
                              <Skeleton className="h-3 w-64" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : equipmentError ? (
            // Phase 2 - BUILD: Error state with retry for equipment list
            <Card className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="error-equipment-list">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">Failed to Load Equipment</h3>
                <p className="text-sm text-red-800 dark:text-red-400 mb-4">
                  Unable to fetch equipment list. Please try again.
                </p>
                <Button 
                  onClick={handleRetryEquipment}
                  variant="outline"
                  data-testid="button-retry-equipment"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredEquipment && filteredEquipment.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="container-equipment-grid">
                {filteredEquipment.map((item) => {
                  // Phase 3 - OPTIMIZE: Get icon component using memoized function
                  const IconComponent = getTypeIcon(item.type);
                  
                  return (
                    <Link key={item.id} href={`/equipment/${item.id}`}>
                      <Card className="hover-elevate cursor-pointer" data-testid={`card-equipment-${item.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {/* Phase 3 - OPTIMIZE: Using lucide icon instead of emoji */}
                              <IconComponent className="h-6 w-6 text-primary" data-testid={`icon-equipment-type-${item.id}`} />
                              <div>
                                <CardTitle className="text-base" data-testid={`text-equipment-name-${item.id}`}>{item.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {item.manufacturer} {item.model}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Serial:</span>
                              <span className="text-xs font-medium" data-testid={`text-equipment-serial-${item.id}`}>
                                {item.serialNumber || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Status:</span>
                              <Badge 
                                className={getStatusColor(item.status)}
                                data-testid={`badge-equipment-status-${item.id}`}
                              >
                                {item.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                            {getCalibrationStatus(item) && (
                              <div className="pt-2" data-testid={`container-calibration-status-${item.id}`}>
                                {getCalibrationStatus(item)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2" data-testid="container-equipment-list">
                {filteredEquipment.map((item) => {
                  // Phase 3 - OPTIMIZE: Get icon component using memoized function
                  const IconComponent = getTypeIcon(item.type);
                  
                  return (
                    <Link key={item.id} href={`/equipment/${item.id}`}>
                      <Card className="hover-elevate cursor-pointer" data-testid={`row-equipment-${item.id}`}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-4">
                            {/* Phase 3 - OPTIMIZE: Using lucide icon instead of emoji */}
                            <IconComponent className="h-6 w-6 text-primary" />
                            <div>
                              <div className="font-medium" data-testid={`text-equipment-name-${item.id}`}>{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.manufacturer} {item.model} • SN: {item.serialNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getCalibrationStatus(item)}
                            <Badge 
                              className={getStatusColor(item.status)}
                              data-testid={`badge-equipment-status-${item.id}`}
                            >
                              {item.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            // Phase 5 - HARDEN: Empty state handling
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-equipment-list">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No equipment found</p>
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="checkout">
          <Card>
            <CardHeader>
              <CardTitle>Quick Check In/Out</CardTitle>
              <CardDescription>Manage equipment checkouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/equipment/checkout">
                <Button className="w-full" data-testid="button-manage-checkouts">
                  <User className="mr-2 h-4 w-4" />
                  Manage Checkouts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calibration">
          <Card>
            <CardHeader>
              <CardTitle>Calibration Schedule</CardTitle>
              <CardDescription>View and manage calibration schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/equipment/calibrations">
                <Button className="w-full" data-testid="button-view-calibration-schedule">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Calibration Schedule
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Log</CardTitle>
              <CardDescription>Track equipment maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/equipment/maintenance">
                <Button className="w-full" data-testid="button-view-maintenance-log">
                  <Wrench className="mr-2 h-4 w-4" />
                  View Maintenance Log
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper with proper fallback UI and retry mechanism
// This catches any React errors and provides a user-friendly recovery option
export default function Equipment() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto p-6">
          <Card className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mb-4" />
              <h2 className="text-xl font-semibold text-red-900 dark:text-red-300 mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-red-800 dark:text-red-400 mb-4 text-center max-w-md">
                The Equipment page encountered an error. Please try refreshing the page.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                data-testid="button-error-reload"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <EquipmentContent />
    </ErrorBoundary>
  );
}
