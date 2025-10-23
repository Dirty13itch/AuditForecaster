import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { GoogleEvent, Builder } from '@shared/schema';

const convertEventSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  address: z.string().min(1, 'Address is required'),
  inspectionType: z.string().min(1, 'Inspection type is required'),
  builderId: z.string().optional(),
  contractor: z.string().min(1, 'Contractor is required'),
  notes: z.string().optional(),
  scheduledStartTime: z.string().min(1, 'Start time is required'),
  scheduledEndTime: z.string().min(1, 'End time is required'),
  keepSynced: z.boolean().default(true),
});

type ConvertEventFormData = z.infer<typeof convertEventSchema>;

interface ConvertGoogleEventDialogProps {
  googleEvent: GoogleEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function extractInspectionType(title: string): string {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('tdl')) return 'TDL';
  if (titleLower.includes('dlo')) return 'DLO';
  if (titleLower.includes('final')) return 'Final';
  if (titleLower.includes('rough')) return 'Rough';
  return '';
}

export function ConvertGoogleEventDialog({ 
  googleEvent, 
  open, 
  onOpenChange,
  onSuccess 
}: ConvertGoogleEventDialogProps) {
  const { toast } = useToast();
  
  const { data: builders = [] } = useQuery<Builder[]>({
    queryKey: ['/api/builders'],
  });
  
  const form = useForm<ConvertEventFormData>({
    resolver: zodResolver(convertEventSchema),
    defaultValues: {
      name: '',
      address: '',
      inspectionType: '',
      builderId: '',
      contractor: '',
      notes: '',
      scheduledStartTime: '',
      scheduledEndTime: '',
      keepSynced: true,
    },
  });
  
  useEffect(() => {
    if (googleEvent) {
      form.reset({
        name: googleEvent.title || '',
        address: googleEvent.location || '',
        inspectionType: extractInspectionType(googleEvent.title),
        builderId: '',
        contractor: '',
        notes: googleEvent.description || '',
        scheduledStartTime: format(new Date(googleEvent.startTime), "yyyy-MM-dd'T'HH:mm"),
        scheduledEndTime: format(new Date(googleEvent.endTime), "yyyy-MM-dd'T'HH:mm"),
        keepSynced: true,
      });
    }
  }, [googleEvent]);
  
  const convertMutation = useMutation({
    mutationFn: async (data: ConvertEventFormData) => {
      if (!googleEvent) throw new Error('No Google event selected');
      
      const response = await apiRequest('POST', `/api/google-events/${googleEvent.id}/convert`, {
        jobData: {
          name: data.name,
          address: data.address,
          inspectionType: data.inspectionType,
          builderId: data.builderId || null,
          contractor: data.contractor,
          notes: data.notes,
          status: 'scheduled',
          priority: 'medium',
        },
        scheduleData: {
          startTime: new Date(data.scheduledStartTime),
          endTime: new Date(data.scheduledEndTime),
        },
        keepSynced: data.keepSynced,
      });
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedule-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/google-events'] });
      
      toast({ 
        title: 'Event converted to job',
        description: 'The Google Calendar event has been successfully converted to a job',
      });
      
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to convert event',
        description: error.message || 'An error occurred while converting the event',
        variant: 'destructive'
      });
    },
  });
  
  const handleSubmit = (data: ConvertEventFormData) => {
    convertMutation.mutate(data);
  };
  
  if (!googleEvent) return null;
  
  const inspectionTypes = ['TDL', 'DLO', 'Final', 'Rough', 'Pre-drywall', 'Insulation', 'HERS'];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-convert-event">
        <DialogHeader>
          <DialogTitle>Convert Google Calendar Event to Job</DialogTitle>
          <DialogDescription>
            Create a new job from this Google Calendar event
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted p-4 rounded-md space-y-2" data-testid="event-summary">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold" data-testid="text-event-title">{googleEvent.title}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="text-event-time">
              {format(new Date(googleEvent.startTime), 'MMM dd, yyyy h:mm a')} - 
              {format(new Date(googleEvent.endTime), 'h:mm a')}
            </span>
          </div>
          {googleEvent.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-event-location">{googleEvent.location}</span>
            </div>
          )}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-job-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inspectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspection Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-inspection-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inspectionTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="builderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Builder</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-builder">
                          <SelectValue placeholder="Select builder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {builders.map(builder => (
                          <SelectItem key={builder.id} value={builder.id}>
                            {builder.name} - {builder.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="contractor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-contractor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="textarea-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="keepSynced"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-keep-synced"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">
                    Keep synced with Google Calendar
                  </FormLabel>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={convertMutation.isPending}
                data-testid="button-create-job"
              >
                {convertMutation.isPending ? 'Creating...' : 'Create Job'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
