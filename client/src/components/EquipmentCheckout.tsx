import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package2, User, Calendar, AlertCircle } from 'lucide-react';
import type { Equipment, EquipmentCheckout, Job } from '@shared/schema';

interface EquipmentCheckoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'checkout' | 'checkin';
  equipmentId?: string;
  checkoutId?: string;
}

export function EquipmentCheckout({ 
  open, 
  onOpenChange, 
  mode, 
  equipmentId,
  checkoutId 
}: EquipmentCheckoutProps) {
  const { toast } = useToast();
  const [selectedEquipment, setSelectedEquipment] = useState(equipmentId || '');
  const [selectedJob, setSelectedJob] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [condition, setCondition] = useState<'good' | 'fair' | 'poor'>('good');
  const [notes, setNotes] = useState('');

  // Fetch available equipment
  const { data: equipment } = useQuery<Equipment[]>({
    queryKey: ['/api/equipment', { status: 'available' }],
    enabled: mode === 'checkout' && open,
  });

  // Fetch active jobs for linking
  const { data: jobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs', { status: 'pending' }],
    enabled: mode === 'checkout' && open,
  });

  // Fetch checkout details for check-in
  const { data: checkoutDetails } = useQuery<EquipmentCheckout>({
    queryKey: [`/api/checkouts/${checkoutId}`],
    enabled: mode === 'checkin' && !!checkoutId && open,
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (data: {
      equipmentId: string;
      jobId?: string;
      expectedReturn?: Date;
      notes?: string;
    }) => {
      return apiRequest('/api/checkouts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checkouts'] });
      toast({
        title: 'Success',
        description: 'Equipment checked out successfully',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check out equipment',
        variant: 'destructive',
      });
    },
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: {
      condition: 'good' | 'fair' | 'poor';
      notes?: string;
    }) => {
      return apiRequest(`/api/checkouts/${checkoutId}/checkin`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checkouts'] });
      toast({
        title: 'Success',
        description: 'Equipment checked in successfully',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in equipment',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedEquipment('');
    setSelectedJob('');
    setExpectedReturn('');
    setCondition('good');
    setNotes('');
  };

  const handleCheckout = () => {
    if (!selectedEquipment) {
      toast({
        title: 'Error',
        description: 'Please select equipment to check out',
        variant: 'destructive',
      });
      return;
    }

    checkoutMutation.mutate({
      equipmentId: selectedEquipment,
      jobId: selectedJob || undefined,
      expectedReturn: expectedReturn ? new Date(expectedReturn) : undefined,
      notes: notes || undefined,
    });
  };

  const handleCheckin = () => {
    checkinMutation.mutate({
      condition,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'checkout' ? 'Check Out Equipment' : 'Check In Equipment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'checkout' 
              ? 'Select equipment to check out for use'
              : 'Return equipment and note its condition'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'checkout' ? (
            <>
              <div>
                <Label htmlFor="equipment">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger data-testid="select-equipment">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{item.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {item.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="job">Link to Job (Optional)</Label>
                <Select value={selectedJob} onValueChange={setSelectedJob}>
                  <SelectTrigger data-testid="select-job">
                    <SelectValue placeholder="Select job (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Job</SelectItem>
                    {jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.address} - {job.builderName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expectedReturn">Expected Return Date</Label>
                <Input
                  id="expectedReturn"
                  type="date"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  data-testid="input-expected-return"
                />
              </div>
            </>
          ) : (
            <>
              {checkoutDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Equipment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Equipment ID: {checkoutDetails.equipmentId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Checked out by: {checkoutDetails.userId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Checkout date: {format(new Date(checkoutDetails.checkoutDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {checkoutDetails.expectedReturn && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Expected return: {format(new Date(checkoutDetails.expectedReturn), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={(value) => setCondition(value as 'good' | 'fair' | 'poor')}>
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good - No issues</SelectItem>
                    <SelectItem value="fair">Fair - Minor wear</SelectItem>
                    <SelectItem value="poor">Poor - Needs attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder={mode === 'checkout' 
                ? 'Add any notes about the checkout...'
                : 'Note any issues or damage...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={mode === 'checkout' ? handleCheckout : handleCheckin}
              disabled={
                mode === 'checkout' 
                  ? checkoutMutation.isPending || !selectedEquipment
                  : checkinMutation.isPending
              }
              data-testid={`button-${mode}`}
            >
              {mode === 'checkout' 
                ? checkoutMutation.isPending ? 'Checking out...' : 'Check Out'
                : checkinMutation.isPending ? 'Checking in...' : 'Check In'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}