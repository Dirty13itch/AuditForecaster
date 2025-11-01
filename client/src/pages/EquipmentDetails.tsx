import { useState, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TableSkeleton, FormSkeleton } from '@/components/ui/skeleton-variants';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  QrCode,
  Calendar as CalendarIcon,
  Wrench,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Equipment, EquipmentCalibration, EquipmentMaintenance, EquipmentCheckout } from '@shared/schema';

function EquipmentDetailsContent() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Equipment>>({});
  const { toast } = useToast();

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  const { 
    data: equipment, 
    isLoading: equipmentLoading,
    error: equipmentError,
    refetch: refetchEquipment
  } = useQuery<Equipment>({
    queryKey: [`/api/equipment/${id}`],
    enabled: !!id,
    retry: 2,
  });

  const { 
    data: calibrations,
    isLoading: calibrationsLoading,
    error: calibrationsError,
    refetch: refetchCalibrations
  } = useQuery<EquipmentCalibration[]>({
    queryKey: [`/api/equipment/${id}/calibrations`],
    enabled: !!id,
    retry: 2,
  });

  const { 
    data: maintenance,
    isLoading: maintenanceLoading,
    error: maintenanceError,
    refetch: refetchMaintenance
  } = useQuery<EquipmentMaintenance[]>({
    queryKey: [`/api/equipment/${id}/maintenance`],
    enabled: !!id,
    retry: 2,
  });

  const { 
    data: checkouts,
    isLoading: checkoutsLoading,
    error: checkoutsError,
    refetch: refetchCheckouts
  } = useQuery<EquipmentCheckout[]>({
    queryKey: [`/api/equipment/${id}/checkouts`],
    enabled: !!id,
    retry: 2,
  });

  // Update equipment mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      return apiRequest(`/api/equipment/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}`] });
      toast({
        title: 'Success',
        description: 'Equipment updated successfully',
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update equipment',
        variant: 'destructive',
      });
    },
  });

  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/equipment/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Equipment deleted successfully',
      });
      setLocation('/equipment');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete equipment',
        variant: 'destructive',
      });
    },
  });

  // Phase 3 - OPTIMIZE: Memoized callbacks
  const handleEdit = useCallback(() => {
    setEditedData(equipment || {});
    setIsEditing(true);
  }, [equipment]);

  const handleSave = useCallback(() => {
    updateMutation.mutate(editedData);
  }, [editedData, updateMutation]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedData({});
  }, []);

  const handleBack = useCallback(() => {
    setLocation('/equipment');
  }, [setLocation]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  const handleRefreshAll = useCallback(() => {
    refetchEquipment();
    refetchCalibrations();
    refetchMaintenance();
    refetchCheckouts();
  }, [refetchEquipment, refetchCalibrations, refetchMaintenance, refetchCheckouts]);

  // Phase 3 - OPTIMIZE: Memoized status color calculator
  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  // Phase 3 - OPTIMIZE: Memoized calibration status checks
  const isCalibrationDue = useMemo(() => {
    if (!equipment?.calibrationDue) return false;
    const due = new Date(equipment.calibrationDue);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7;
  }, [equipment?.calibrationDue]);

  const isCalibrationOverdue = useMemo(() => {
    if (!equipment?.calibrationDue) return false;
    return new Date(equipment.calibrationDue) < new Date();
  }, [equipment?.calibrationDue]);

  const isLoading = equipmentLoading;
  const hasError = equipmentError || calibrationsError || maintenanceError || checkoutsError;

  // Phase 2 - BUILD: Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="container mx-auto p-6" data-testid="page-equipment-details-loading">
        <div className="space-y-6">
          <FormSkeleton fields={8} />
        </div>
      </div>
    );
  }

  // Phase 2 - BUILD: Error state with retry
  if (hasError && !equipment) {
    return (
      <div className="container mx-auto p-6" data-testid="page-equipment-details-error">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span data-testid="text-error-message">
              {equipmentError instanceof Error ? equipmentError.message : 'Failed to load equipment details'}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not found state
  if (!equipment) {
    return (
      <div className="container mx-auto p-6" data-testid="page-equipment-not-found">
        <div className="text-center py-12">
          <p className="text-muted-foreground" data-testid="text-not-found">Equipment not found</p>
          <Button className="mt-4" onClick={handleBack} data-testid="button-back-not-found">
            Back to Equipment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="page-equipment-details">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-equipment-name">
              {equipment.name}
            </h1>
            <p className="text-muted-foreground" data-testid="text-equipment-manufacturer">
              {equipment.manufacturer} {equipment.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshAll}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!isEditing ? (
            <Button onClick={handleEdit} data-testid="button-edit">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-delete">Delete</Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-delete">
              <DialogHeader>
                <DialogTitle data-testid="text-delete-title">Delete Equipment</DialogTitle>
                <DialogDescription data-testid="text-delete-description">
                  Are you sure you want to delete this equipment? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3">
                <Button variant="outline" data-testid="button-cancel-delete">Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Alerts */}
      {(isCalibrationOverdue || isCalibrationDue) && (
        <div className="mb-6" data-testid="section-calibration-alerts">
          {isCalibrationOverdue ? (
            <Card className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="alert-calibration-overdue">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" data-testid="icon-overdue" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-300" data-testid="text-overdue-title">
                    Calibration Overdue
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-400" data-testid="text-overdue-description">
                    Calibration was due on {format(new Date(equipment.calibrationDue!), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" data-testid="button-schedule-overdue">
                  Schedule Calibration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-900/10" data-testid="alert-calibration-due">
              <CardContent className="flex items-center gap-3 py-4">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" data-testid="icon-due" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-300" data-testid="text-due-title">
                    Calibration Due Soon
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400" data-testid="text-due-description">
                    Due on {format(new Date(equipment.calibrationDue!), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" data-testid="button-schedule-due">
                  Schedule Calibration
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2" data-testid="card-equipment-info">
          <CardHeader>
            <CardTitle data-testid="text-info-title">Equipment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div data-testid="field-name">
                <Label data-testid="label-name">Name</Label>
                {isEditing ? (
                  <Input
                    value={editedData.name || ''}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                    data-testid="input-edit-name"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-name">{equipment.name}</p>
                )}
              </div>
              <div data-testid="field-type">
                <Label data-testid="label-type">Type</Label>
                {isEditing ? (
                  <Select
                    value={editedData.type || ''}
                    onValueChange={(value) => setEditedData({ ...editedData, type: value })}
                  >
                    <SelectTrigger data-testid="select-edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blower_door" data-testid="option-type-blower-door">Blower Door</SelectItem>
                      <SelectItem value="duct_tester" data-testid="option-type-duct-tester">Duct Tester</SelectItem>
                      <SelectItem value="manometer" data-testid="option-type-manometer">Manometer</SelectItem>
                      <SelectItem value="camera" data-testid="option-type-camera">Camera</SelectItem>
                      <SelectItem value="other" data-testid="option-type-other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium" data-testid="value-type">
                    {equipment.type.replace('_', ' ').toUpperCase()}
                  </p>
                )}
              </div>
              <div data-testid="field-manufacturer">
                <Label data-testid="label-manufacturer">Manufacturer</Label>
                {isEditing ? (
                  <Input
                    value={editedData.manufacturer || ''}
                    onChange={(e) => setEditedData({ ...editedData, manufacturer: e.target.value })}
                    data-testid="input-edit-manufacturer"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-manufacturer">
                    {equipment.manufacturer || 'N/A'}
                  </p>
                )}
              </div>
              <div data-testid="field-model">
                <Label data-testid="label-model">Model</Label>
                {isEditing ? (
                  <Input
                    value={editedData.model || ''}
                    onChange={(e) => setEditedData({ ...editedData, model: e.target.value })}
                    data-testid="input-edit-model"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-model">
                    {equipment.model || 'N/A'}
                  </p>
                )}
              </div>
              <div data-testid="field-serial">
                <Label data-testid="label-serial">Serial Number</Label>
                {isEditing ? (
                  <Input
                    value={editedData.serialNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, serialNumber: e.target.value })}
                    data-testid="input-edit-serial"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-serial">
                    {equipment.serialNumber || 'N/A'}
                  </p>
                )}
              </div>
              <div data-testid="field-status">
                <Label data-testid="label-status">Status</Label>
                {isEditing ? (
                  <Select
                    value={editedData.status || ''}
                    onValueChange={(value) => setEditedData({ ...editedData, status: value })}
                  >
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available" data-testid="option-status-available">Available</SelectItem>
                      <SelectItem value="in_use" data-testid="option-status-in-use">In Use</SelectItem>
                      <SelectItem value="maintenance" data-testid="option-status-maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired" data-testid="option-status-retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(equipment.status)} data-testid="badge-status">
                    {equipment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
              <div data-testid="field-location">
                <Label data-testid="label-location">Location</Label>
                {isEditing ? (
                  <Input
                    value={editedData.location || ''}
                    onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                    data-testid="input-edit-location"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-location">
                    {equipment.location || 'N/A'}
                  </p>
                )}
              </div>
              <div data-testid="field-purchase-date">
                <Label data-testid="label-purchase-date">Purchase Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.purchaseDate ? format(new Date(editedData.purchaseDate), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditedData({ ...editedData, purchaseDate: new Date(e.target.value) })}
                    data-testid="input-edit-purchase-date"
                  />
                ) : (
                  <p className="text-sm font-medium" data-testid="value-purchase-date">
                    {equipment.purchaseDate ? format(new Date(equipment.purchaseDate), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-4" data-testid="field-notes-edit">
                <Label data-testid="label-notes-edit">Notes</Label>
                <Textarea
                  value={editedData.notes || ''}
                  onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-edit-notes"
                />
              </div>
            )}
            {!isEditing && equipment.notes && (
              <div className="mt-4" data-testid="field-notes">
                <Label data-testid="label-notes">Notes</Label>
                <p className="text-sm text-muted-foreground mt-1" data-testid="value-notes">
                  {equipment.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-qr-code">
          <CardHeader>
            <CardTitle data-testid="text-qr-title">QR Code</CardTitle>
            <CardDescription data-testid="text-qr-description">Scan for quick access</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4" data-testid="qr-code-container">
              <QrCode className="w-32 h-32 text-gray-400" data-testid="icon-qr-code" />
            </div>
            <p className="text-xs text-center text-muted-foreground mb-2" data-testid="text-qr-value">
              {equipment.qrCode}
            </p>
            <Button variant="outline" size="sm" data-testid="button-print-qr">
              Print QR Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for History */}
      <Tabs defaultValue="calibration" data-testid="tabs-history">
        <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list-history">
          <TabsTrigger value="calibration" data-testid="tab-calibration">
            Calibration History
          </TabsTrigger>
          <TabsTrigger value="maintenance" data-testid="tab-maintenance">
            Maintenance Log
          </TabsTrigger>
          <TabsTrigger value="checkouts" data-testid="tab-checkouts">
            Checkout History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calibration" data-testid="tab-content-calibration">
          <Card data-testid="card-calibration-history">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-calibration-title">Calibration History</CardTitle>
                <CardDescription data-testid="text-calibration-description">
                  Track calibration records and certificates
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-calibration">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Calibration
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-calibration">
                  <DialogHeader>
                    <DialogTitle data-testid="text-add-calibration-title">Add Calibration Record</DialogTitle>
                    <DialogDescription data-testid="text-add-calibration-description">
                      Record a new calibration for this equipment
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {calibrationsLoading ? (
                <TableSkeleton rows={3} columns={6} />
              ) : calibrationsError ? (
                <Alert variant="destructive" data-testid="alert-calibrations-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-calibrations-error">Failed to load calibration history</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchCalibrations()}
                      data-testid="button-retry-calibrations"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : calibrations && calibrations.length > 0 ? (
                <Table data-testid="table-calibrations">
                  <TableHeader>
                    <TableRow data-testid="row-calibrations-header">
                      <TableHead data-testid="header-cal-date">Date</TableHead>
                      <TableHead data-testid="header-cal-next-due">Next Due</TableHead>
                      <TableHead data-testid="header-cal-performed-by">Performed By</TableHead>
                      <TableHead data-testid="header-cal-certificate">Certificate #</TableHead>
                      <TableHead data-testid="header-cal-result">Result</TableHead>
                      <TableHead data-testid="header-cal-cost">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="tbody-calibrations">
                    {calibrations.map((cal) => (
                      <TableRow key={cal.id} data-testid={`row-calibration-${cal.id}`}>
                        <TableCell data-testid={`cell-cal-date-${cal.id}`}>
                          {format(new Date(cal.calibrationDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell data-testid={`cell-cal-next-${cal.id}`}>
                          {cal.nextDue ? format(new Date(cal.nextDue), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-cal-performed-${cal.id}`}>
                          {cal.performedBy || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-cal-cert-${cal.id}`}>
                          {cal.certificateNumber || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-cal-result-${cal.id}`}>
                          {cal.passed ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400" data-testid={`badge-cal-passed-${cal.id}`}>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400" data-testid={`badge-cal-failed-${cal.id}`}>
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell data-testid={`cell-cal-cost-${cal.id}`}>
                          {cal.cost ? `$${cal.cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="empty-calibrations">
                  <CalendarIcon className="mx-auto h-12 w-12 mb-3 opacity-50" data-testid="icon-empty-calibrations" />
                  <p data-testid="text-empty-calibrations">No calibration records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" data-testid="tab-content-maintenance">
          <Card data-testid="card-maintenance-log">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle data-testid="text-maintenance-title">Maintenance Log</CardTitle>
                <CardDescription data-testid="text-maintenance-description">
                  Track maintenance and repairs
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-maintenance">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Maintenance
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-maintenance">
                  <DialogHeader>
                    <DialogTitle data-testid="text-add-maintenance-title">Add Maintenance Record</DialogTitle>
                    <DialogDescription data-testid="text-add-maintenance-description">
                      Record maintenance or repair work for this equipment
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <TableSkeleton rows={3} columns={5} />
              ) : maintenanceError ? (
                <Alert variant="destructive" data-testid="alert-maintenance-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-maintenance-error">Failed to load maintenance log</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchMaintenance()}
                      data-testid="button-retry-maintenance"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : maintenance && maintenance.length > 0 ? (
                <Table data-testid="table-maintenance">
                  <TableHeader>
                    <TableRow data-testid="row-maintenance-header">
                      <TableHead data-testid="header-maint-date">Date</TableHead>
                      <TableHead data-testid="header-maint-performed-by">Performed By</TableHead>
                      <TableHead data-testid="header-maint-description">Description</TableHead>
                      <TableHead data-testid="header-maint-next-due">Next Due</TableHead>
                      <TableHead data-testid="header-maint-cost">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="tbody-maintenance">
                    {maintenance.map((maint) => (
                      <TableRow key={maint.id} data-testid={`row-maintenance-${maint.id}`}>
                        <TableCell data-testid={`cell-maint-date-${maint.id}`}>
                          {format(new Date(maint.maintenanceDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell data-testid={`cell-maint-performed-${maint.id}`}>
                          {maint.performedBy || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-maint-desc-${maint.id}`}>
                          {maint.description || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-maint-next-${maint.id}`}>
                          {maint.nextDue ? format(new Date(maint.nextDue), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-maint-cost-${maint.id}`}>
                          {maint.cost ? `$${maint.cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="empty-maintenance">
                  <Wrench className="mx-auto h-12 w-12 mb-3 opacity-50" data-testid="icon-empty-maintenance" />
                  <p data-testid="text-empty-maintenance">No maintenance records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkouts" data-testid="tab-content-checkouts">
          <Card data-testid="card-checkout-history">
            <CardHeader>
              <CardTitle data-testid="text-checkouts-title">Checkout History</CardTitle>
              <CardDescription data-testid="text-checkouts-description">
                Equipment usage and checkout records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkoutsLoading ? (
                <TableSkeleton rows={3} columns={5} />
              ) : checkoutsError ? (
                <Alert variant="destructive" data-testid="alert-checkouts-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span data-testid="text-checkouts-error">Failed to load checkout history</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchCheckouts()}
                      data-testid="button-retry-checkouts"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : checkouts && checkouts.length > 0 ? (
                <Table data-testid="table-checkouts">
                  <TableHeader>
                    <TableRow data-testid="row-checkouts-header">
                      <TableHead data-testid="header-checkout-out">Checked Out</TableHead>
                      <TableHead data-testid="header-checkout-in">Checked In</TableHead>
                      <TableHead data-testid="header-checkout-by">Checked Out By</TableHead>
                      <TableHead data-testid="header-checkout-purpose">Purpose</TableHead>
                      <TableHead data-testid="header-checkout-status">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="tbody-checkouts">
                    {checkouts.map((checkout) => (
                      <TableRow key={checkout.id} data-testid={`row-checkout-${checkout.id}`}>
                        <TableCell data-testid={`cell-checkout-out-${checkout.id}`}>
                          {format(new Date(checkout.checkoutDate), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell data-testid={`cell-checkout-in-${checkout.id}`}>
                          {checkout.returnDate ? format(new Date(checkout.returnDate), 'MMM dd, yyyy HH:mm') : 'Not returned'}
                        </TableCell>
                        <TableCell data-testid={`cell-checkout-by-${checkout.id}`}>
                          {checkout.checkedOutBy || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-checkout-purpose-${checkout.id}`}>
                          {checkout.purpose || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-checkout-status-${checkout.id}`}>
                          {checkout.returnDate ? (
                            <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400" data-testid={`badge-checkout-returned-${checkout.id}`}>
                              Returned
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400" data-testid={`badge-checkout-active-${checkout.id}`}>
                              Active
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="empty-checkouts">
                  <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-50" data-testid="icon-empty-checkouts" />
                  <p data-testid="text-empty-checkouts">No checkout records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper
export default function EquipmentDetails() {
  return (
    <ErrorBoundary>
      <EquipmentDetailsContent />
    </ErrorBoundary>
  );
}
