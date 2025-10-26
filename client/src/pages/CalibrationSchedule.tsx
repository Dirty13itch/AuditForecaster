import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Download,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Equipment, EquipmentCalibration } from '@shared/schema';

export default function CalibrationSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('list');

  // Fetch upcoming calibrations
  const { data: upcomingCalibrations } = useQuery<Equipment[]>({
    queryKey: ['/api/calibrations/upcoming', { days: 30 }],
  });

  // Fetch overdue calibrations
  const { data: overdueCalibrations } = useQuery<Equipment[]>({
    queryKey: ['/api/calibrations/overdue'],
  });

  // Calendar helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Organize days for calendar view
  const firstDayOfWeek = getDay(monthStart);
  const leadingEmptyDays = Array(firstDayOfWeek).fill(null);
  const calendarDays = [...leadingEmptyDays, ...monthDays];

  // Group calibrations by date
  const calibrationsByDate = new Map<string, Equipment[]>();
  upcomingCalibrations?.forEach(equipment => {
    if (equipment.calibrationDue) {
      const dateKey = format(new Date(equipment.calibrationDue), 'yyyy-MM-dd');
      if (!calibrationsByDate.has(dateKey)) {
        calibrationsByDate.set(dateKey, []);
      }
      calibrationsByDate.get(dateKey)!.push(equipment);
    }
  });

  const getCalibrationStatus = (dueDate: Date) => {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return { color: 'bg-red-500', text: 'Overdue' };
    if (daysUntilDue <= 7) return { color: 'bg-yellow-500', text: `${daysUntilDue} days` };
    return { color: 'bg-green-500', text: `${daysUntilDue} days` };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Calibration Schedule</h1>
          <p className="text-muted-foreground">Manage equipment calibration schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export Schedule
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="mb-6 space-y-3">
        {overdueCalibrations && overdueCalibrations.length > 0 && (
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertTitle className="text-red-900 dark:text-red-300">Overdue Calibrations</AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400">
              {overdueCalibrations.length} equipment items have overdue calibrations. Schedule them immediately.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list" data-testid="tab-list-view">List View</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar-view">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-6">
          {/* Overdue Calibrations */}
          {overdueCalibrations && overdueCalibrations.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-900 dark:text-red-300">Overdue Calibrations</CardTitle>
                <CardDescription>These calibrations need immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueCalibrations.map((equipment) => {
                      const dueDate = new Date(equipment.calibrationDue!);
                      const daysOverdue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={equipment.id} data-testid={`row-overdue-${equipment.id}`}>
                          <TableCell className="font-medium">{equipment.name}</TableCell>
                          <TableCell>{equipment.type.replace('_', ' ')}</TableCell>
                          <TableCell>{equipment.serialNumber || 'N/A'}</TableCell>
                          <TableCell>{format(dueDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
                              {daysOverdue} days overdue
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/equipment/${equipment.id}`}>
                              <Button size="sm" variant="outline" data-testid={`button-schedule-${equipment.id}`}>
                                Schedule Now
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Calibrations */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Calibrations (Next 30 Days)</CardTitle>
              <CardDescription>Equipment requiring calibration soon</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingCalibrations && upcomingCalibrations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingCalibrations.map((equipment) => {
                      const dueDate = new Date(equipment.calibrationDue!);
                      const status = getCalibrationStatus(dueDate);
                      return (
                        <TableRow key={equipment.id} data-testid={`row-upcoming-${equipment.id}`}>
                          <TableCell className="font-medium">{equipment.name}</TableCell>
                          <TableCell>{equipment.type.replace('_', ' ')}</TableCell>
                          <TableCell>{equipment.serialNumber || 'N/A'}</TableCell>
                          <TableCell>{format(dueDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge className={`${status.color}/10 ${status.color.replace('bg-', 'text-').replace('500', '700')} dark:${status.color.replace('bg-', 'text-').replace('500', '400')}`}>
                              {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/equipment/${equipment.id}`}>
                              <Button size="sm" variant="outline" data-testid={`button-view-${equipment.id}`}>
                                View Details
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>No calibrations due in the next 30 days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => navigateMonth('prev')}
                    data-testid="button-prev-month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentDate(new Date())}
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => navigateMonth('next')}
                    data-testid="button-next-month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {/* Weekday headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="bg-background p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="bg-background min-h-[100px]" />;
                  }
                  
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayCalibrations = calibrationsByDate.get(dateKey) || [];
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <div
                      key={dateKey}
                      className={`bg-background p-2 min-h-[100px] ${
                        isCurrentDay ? 'ring-2 ring-primary' : ''
                      }`}
                      data-testid={`calendar-day-${dateKey}`}
                    >
                      <div className={`text-sm mb-1 ${
                        isCurrentDay ? 'font-bold' : ''
                      }`}>
                        {format(day, 'd')}
                      </div>
                      {dayCalibrations.length > 0 && (
                        <div className="space-y-1">
                          {dayCalibrations.slice(0, 2).map((equipment) => {
                            const status = getCalibrationStatus(new Date(equipment.calibrationDue!));
                            return (
                              <Link key={equipment.id} href={`/equipment/${equipment.id}`}>
                                <div
                                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${status.color}/20`}
                                  title={equipment.name}
                                >
                                  <div className="truncate font-medium">
                                    {equipment.name}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                          {dayCalibrations.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayCalibrations.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Legend */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-muted-foreground">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span className="text-muted-foreground">Due Soon (≤7 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-muted-foreground">Upcoming</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}