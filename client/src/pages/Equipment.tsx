import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  Filter,
  QrCode,
  CheckCircle,
  AlertCircle,
  Wrench,
  Calendar,
  User,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'wouter';
import type { Equipment, EquipmentCalibration, EquipmentCheckout } from '@shared/schema';
import ExportDialog from '@/components/ExportDialog';
import { format } from 'date-fns';

export default function Equipment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch equipment
  const { data: equipment, isLoading: loadingEquipment } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment'],
  });

  // Fetch alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery<{
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
  });

  // Filter equipment based on search and filters
  const filteredEquipment = equipment?.filter((item) => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'in_use':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'maintenance':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'retired':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'blower_door':
        return '🌬️';
      case 'duct_tester':
        return '🔧';
      case 'manometer':
        return '📊';
      case 'camera':
        return '📷';
      default:
        return '⚙️';
    }
  };

  const getCalibrationStatus = (item: Equipment) => {
    if (!item.calibrationDue) return null;
    
    const now = new Date();
    const due = new Date(item.calibrationDue);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) {
      return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">Overdue</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Due in {daysUntilDue} days</Badge>;
    }
    return null;
  };

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

      {/* Alerts Section */}
      {alerts && (alerts.calibrationDue > 0 || alerts.overdueCalibrations > 0 || alerts.overdueCheckouts > 0) && (
        <div className="mb-6 space-y-3">
          {alerts.overdueCalibrations > 0 && (
            <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-900 dark:text-red-300">Calibration Overdue</AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-400">
                {alerts.overdueCalibrations} equipment items have overdue calibrations
              </AlertDescription>
            </Alert>
          )}
          {alerts.calibrationDue > 0 && (
            <Alert className="border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-900/10">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-900 dark:text-yellow-300">Calibration Due Soon</AlertTitle>
              <AlertDescription className="text-yellow-800 dark:text-yellow-400">
                {alerts.calibrationDue} equipment items need calibration within 7 days
              </AlertDescription>
            </Alert>
          )}
          {alerts.overdueCheckouts > 0 && (
            <Alert className="border-orange-600/20 bg-orange-50/50 dark:bg-orange-900/10">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertTitle className="text-orange-900 dark:text-orange-300">Equipment Not Returned</AlertTitle>
              <AlertDescription className="text-orange-800 dark:text-orange-400">
                {alerts.overdueCheckouts} equipment items were not returned on time
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, serial, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-equipment"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="blower_door">Blower Door</SelectItem>
              <SelectItem value="duct_tester">Duct Tester</SelectItem>
              <SelectItem value="manometer">Manometer</SelectItem>
              <SelectItem value="camera">Camera</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
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
          {/* Equipment Grid/List */}
          {loadingEquipment ? (
            <div className="text-center py-8 text-muted-foreground">Loading equipment...</div>
          ) : filteredEquipment && filteredEquipment.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEquipment.map((item) => (
                  <Link key={item.id} href={`/equipment/${item.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-equipment-${item.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getTypeIcon(item.type)}</span>
                            <div>
                              <CardTitle className="text-base">{item.name}</CardTitle>
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
                            <span className="text-xs font-medium">{item.serialNumber || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Status:</span>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          {getCalibrationStatus(item) && (
                            <div className="pt-2">
                              {getCalibrationStatus(item)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEquipment.map((item) => (
                  <Link key={item.id} href={`/equipment/${item.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`row-equipment-${item.id}`}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{getTypeIcon(item.type)}</span>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.manufacturer} {item.model} • SN: {item.serialNumber || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getCalibrationStatus(item)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No equipment found</p>
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
                <Button className="w-full" data-testid="button-view-schedule">
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
                <Button className="w-full" data-testid="button-view-maintenance">
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