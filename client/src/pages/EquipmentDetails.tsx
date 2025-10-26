import { useState } from 'react';
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
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  QrCode,
  Calendar,
  Wrench,
  DollarSign,
  CheckCircle,
  XCircle,
  Plus,
  User,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Equipment, EquipmentCalibration, EquipmentMaintenance, EquipmentCheckout } from '@shared/schema';

export default function EquipmentDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Equipment>>({});
  const { toast } = useToast();

  // Fetch equipment details
  const { data: equipment, isLoading } = useQuery<Equipment>({
    queryKey: [`/api/equipment/${id}`],
    enabled: !!id,
  });

  // Fetch calibrations
  const { data: calibrations } = useQuery<EquipmentCalibration[]>({
    queryKey: [`/api/equipment/${id}/calibrations`],
    enabled: !!id,
  });

  // Fetch maintenance history
  const { data: maintenance } = useQuery<EquipmentMaintenance[]>({
    queryKey: [`/api/equipment/${id}/maintenance`],
    enabled: !!id,
  });

  // Fetch checkouts
  const { data: checkouts } = useQuery<EquipmentCheckout[]>({
    queryKey: [`/api/equipment/${id}/checkouts`],
    enabled: !!id,
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
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete equipment',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = () => {
    setEditedData(equipment || {});
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editedData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading equipment details...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Equipment not found</div>
      </div>
    );
  }

  const isCalibrationDue = () => {
    if (!equipment.calibrationDue) return false;
    const due = new Date(equipment.calibrationDue);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7;
  };

  const isCalibrationOverdue = () => {
    if (!equipment.calibrationDue) return false;
    return new Date(equipment.calibrationDue) < new Date();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/equipment')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-equipment-name">
              {equipment.name}
            </h1>
            <p className="text-muted-foreground">
              {equipment.manufacturer} {equipment.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit} data-testid="button-edit">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} data-testid="button-save">
                <Save className="mr-2 h-4 w-4" />
                Save
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Equipment</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this equipment? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Alerts */}
      {(isCalibrationOverdue() || isCalibrationDue()) && (
        <div className="mb-6">
          {isCalibrationOverdue() ? (
            <Card className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-300">Calibration Overdue</p>
                  <p className="text-sm text-red-800 dark:text-red-400">
                    Calibration was due on {format(new Date(equipment.calibrationDue!), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  Schedule Calibration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-600/20 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="flex items-center gap-3 py-4">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 dark:text-yellow-300">Calibration Due Soon</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    Due on {format(new Date(equipment.calibrationDue!), 'MMM dd, yyyy')}
                  </p>
                </div>
                <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  Schedule Calibration
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equipment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                {isEditing ? (
                  <Input
                    value={editedData.name || ''}
                    onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                    data-testid="input-edit-name"
                  />
                ) : (
                  <p className="text-sm font-medium">{equipment.name}</p>
                )}
              </div>
              <div>
                <Label>Type</Label>
                {isEditing ? (
                  <Select
                    value={editedData.type || ''}
                    onValueChange={(value) => setEditedData({ ...editedData, type: value })}
                  >
                    <SelectTrigger data-testid="select-edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blower_door">Blower Door</SelectItem>
                      <SelectItem value="duct_tester">Duct Tester</SelectItem>
                      <SelectItem value="manometer">Manometer</SelectItem>
                      <SelectItem value="camera">Camera</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{equipment.type.replace('_', ' ').toUpperCase()}</p>
                )}
              </div>
              <div>
                <Label>Manufacturer</Label>
                {isEditing ? (
                  <Input
                    value={editedData.manufacturer || ''}
                    onChange={(e) => setEditedData({ ...editedData, manufacturer: e.target.value })}
                    data-testid="input-edit-manufacturer"
                  />
                ) : (
                  <p className="text-sm font-medium">{equipment.manufacturer || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Model</Label>
                {isEditing ? (
                  <Input
                    value={editedData.model || ''}
                    onChange={(e) => setEditedData({ ...editedData, model: e.target.value })}
                    data-testid="input-edit-model"
                  />
                ) : (
                  <p className="text-sm font-medium">{equipment.model || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Serial Number</Label>
                {isEditing ? (
                  <Input
                    value={editedData.serialNumber || ''}
                    onChange={(e) => setEditedData({ ...editedData, serialNumber: e.target.value })}
                    data-testid="input-edit-serial"
                  />
                ) : (
                  <p className="text-sm font-medium">{equipment.serialNumber || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                {isEditing ? (
                  <Select
                    value={editedData.status || ''}
                    onValueChange={(value) => setEditedData({ ...editedData, status: value })}
                  >
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(equipment.status)}>
                    {equipment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
              <div>
                <Label>Location</Label>
                {isEditing ? (
                  <Input
                    value={editedData.location || ''}
                    onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                    data-testid="input-edit-location"
                  />
                ) : (
                  <p className="text-sm font-medium">{equipment.location || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Purchase Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.purchaseDate ? format(new Date(editedData.purchaseDate), 'yyyy-MM-dd') : ''}
                    onChange={(e) => setEditedData({ ...editedData, purchaseDate: new Date(e.target.value) })}
                    data-testid="input-edit-purchase-date"
                  />
                ) : (
                  <p className="text-sm font-medium">
                    {equipment.purchaseDate ? format(new Date(equipment.purchaseDate), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-4">
                <Label>Notes</Label>
                <Textarea
                  value={editedData.notes || ''}
                  onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-edit-notes"
                />
              </div>
            )}
            {!isEditing && equipment.notes && (
              <div className="mt-4">
                <Label>Notes</Label>
                <p className="text-sm text-muted-foreground mt-1">{equipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Scan for quick access</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="w-32 h-32 text-gray-400" />
            </div>
            <p className="text-xs text-center text-muted-foreground mb-2">
              {equipment.qrCode}
            </p>
            <Button variant="outline" size="sm" data-testid="button-print-qr">
              Print QR Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for History */}
      <Tabs defaultValue="calibration">
        <TabsList className="grid w-full grid-cols-3">
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

        <TabsContent value="calibration">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Calibration History</CardTitle>
                <CardDescription>Track calibration records and certificates</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-calibration">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Calibration
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Calibration Record</DialogTitle>
                    <DialogDescription>
                      Record a new calibration for this equipment
                    </DialogDescription>
                  </DialogHeader>
                  {/* Add calibration form here */}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {calibrations && calibrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Certificate #</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calibrations.map((cal) => (
                      <TableRow key={cal.id} data-testid={`row-calibration-${cal.id}`}>
                        <TableCell>
                          {format(new Date(cal.calibrationDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {cal.nextDue ? format(new Date(cal.nextDue), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>{cal.performedBy || 'N/A'}</TableCell>
                        <TableCell>{cal.certificateNumber || 'N/A'}</TableCell>
                        <TableCell>
                          {cal.passed ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
                              <XCircle className="mr-1 h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cal.cost ? `$${cal.cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No calibration records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Maintenance Log</CardTitle>
                <CardDescription>Track maintenance and repairs</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-maintenance">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Maintenance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Maintenance Record</DialogTitle>
                    <DialogDescription>
                      Record maintenance or repair work for this equipment
                    </DialogDescription>
                  </DialogHeader>
                  {/* Add maintenance form here */}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {maintenance && maintenance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map((maint) => (
                      <TableRow key={maint.id} data-testid={`row-maintenance-${maint.id}`}>
                        <TableCell>
                          {format(new Date(maint.maintenanceDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{maint.performedBy || 'N/A'}</TableCell>
                        <TableCell>{maint.description || 'N/A'}</TableCell>
                        <TableCell>
                          {maint.nextDue ? format(new Date(maint.nextDue), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {maint.cost ? `$${maint.cost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No maintenance records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkouts">
          <Card>
            <CardHeader>
              <CardTitle>Checkout History</CardTitle>
              <CardDescription>Track who has used this equipment</CardDescription>
            </CardHeader>
            <CardContent>
              {checkouts && checkouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Checkout Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkouts.map((checkout) => (
                      <TableRow key={checkout.id} data-testid={`row-checkout-${checkout.id}`}>
                        <TableCell>{checkout.userId}</TableCell>
                        <TableCell>{checkout.jobId || 'N/A'}</TableCell>
                        <TableCell>
                          {format(new Date(checkout.checkoutDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {checkout.actualReturn 
                            ? format(new Date(checkout.actualReturn), 'MMM dd, yyyy')
                            : checkout.expectedReturn
                            ? `Expected: ${format(new Date(checkout.expectedReturn), 'MMM dd')}`
                            : 'Not returned'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            checkout.condition === 'good' 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                              : checkout.condition === 'fair'
                              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-500/10 text-red-700 dark:text-red-400'
                          }>
                            {checkout.condition ? checkout.condition.toUpperCase() : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {checkout.actualReturn ? (
                            <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400">
                              Returned
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              Checked Out
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No checkout history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}