import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday } from 'date-fns';
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
import { TableSkeleton } from '@/components/ui/skeleton-variants';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  AlertCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Equipment } from '@shared/schema';

function CalibrationScheduleContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('list');

  // Phase 5 - HARDEN: All queries have retry: 2 for resilience
  const { 
    data: upcomingCalibrations,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming
  } = useQuery<Equipment[]>({
    queryKey: ['/api/calibrations/upcoming', { days: 30 }],
    retry: 2,
  });

  const { 
    data: overdueCalibrations,
    isLoading: overdueLoading,
    error: overdueError,
    refetch: refetchOverdue
  } = useQuery<Equipment[]>({
    queryKey: ['/api/calibrations/overdue'],
    retry: 2,
  });

  // Phase 3 - OPTIMIZE: Memoized calendar calculations
  const { monthStart, monthEnd, monthDays, calendarDays } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const leadingEmptyDays = Array(firstDayOfWeek).fill(null);
    const allDays = [...leadingEmptyDays, ...days];

    return {
      monthStart: start,
      monthEnd: end,
      monthDays: days,
      calendarDays: allDays,
    };
  }, [currentDate]);

  // Phase 3 - OPTIMIZE: Memoized calibrations by date mapping
  const calibrationsByDate = useMemo(() => {
    const map = new Map<string, Equipment[]>();
    upcomingCalibrations?.forEach(equipment => {
      if (equipment.calibrationDue) {
        const dateKey = format(new Date(equipment.calibrationDue), 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(equipment);
      }
    });
    return map;
  }, [upcomingCalibrations]);

  // Phase 3 - OPTIMIZE: Memoized calibration status calculator
  const getCalibrationStatus = useCallback((dueDate: Date) => {
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return { color: 'bg-red-500', text: 'Overdue' };
    if (daysUntilDue <= 7) return { color: 'bg-yellow-500', text: `${daysUntilDue} days` };
    return { color: 'bg-green-500', text: `${daysUntilDue} days` };
  }, []);

  // Phase 3 - OPTIMIZE: Memoized month navigation callbacks
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleRefreshAll = useCallback(() => {
    refetchUpcoming();
    refetchOverdue();
  }, [refetchUpcoming, refetchOverdue]);

  const isLoading = upcomingLoading || overdueLoading;
  const hasError = upcomingError || overdueError;

  return (
    <div className="container mx-auto p-6" data-testid="page-calibration-schedule">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Calibration Schedule</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Manage equipment calibration schedules
          </p>
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
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export Schedule
          </Button>
        </div>
      </div>

      {/* Phase 2 - BUILD: Error states with retry buttons */}
      {hasError && (
        <Alert variant="destructive" className="mb-6" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle data-testid="text-error-title">Error Loading Calibrations</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span data-testid="text-error-message">
              {upcomingError instanceof Error ? upcomingError.message : 
               overdueError instanceof Error ? overdueError.message : 'Failed to load calibration data'}
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
      )}

      {/* Alerts for overdue calibrations */}
      {!isLoading && !hasError && overdueCalibrations && overdueCalibrations.length > 0 && (
        <div className="mb-6 space-y-3" data-testid="section-alerts">
          <Alert className="border-red-600/20 bg-red-50/50 dark:bg-red-900/10" data-testid="alert-overdue">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" data-testid="icon-alert-overdue" />
            <AlertTitle className="text-red-900 dark:text-red-300" data-testid="text-alert-overdue-title">
              Overdue Calibrations
            </AlertTitle>
            <AlertDescription className="text-red-800 dark:text-red-400" data-testid="text-alert-overdue-description">
              {overdueCalibrations.length} equipment items have overdue calibrations. Schedule them immediately.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')} className="mb-6" data-testid="tabs-view-toggle">
        <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabs-list-view">
          <TabsTrigger value="list" data-testid="tab-list-view">List View</TabsTrigger>
          <TabsTrigger value="calendar" data-testid="tab-calendar-view">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 mt-6" data-testid="tab-content-list">
          {/* Phase 2 - BUILD: Skeleton loaders for loading states */}
          {isLoading && (
            <div className="space-y-6" data-testid="skeleton-loading">
              <Card data-testid="skeleton-overdue-card">
                <CardHeader>
                  <CardTitle data-testid="skeleton-overdue-title">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <TableSkeleton rows={3} columns={6} />
                </CardContent>
              </Card>
              <Card data-testid="skeleton-upcoming-card">
                <CardHeader>
                  <CardTitle data-testid="skeleton-upcoming-title">Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                  <TableSkeleton rows={5} columns={6} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Overdue Calibrations */}
          {!isLoading && !hasError && overdueCalibrations && overdueCalibrations.length > 0 && (
            <Card className="border-red-200 dark:border-red-900" data-testid="card-overdue">
              <CardHeader>
                <CardTitle className="text-red-900 dark:text-red-300" data-testid="text-overdue-title">
                  Overdue Calibrations
                </CardTitle>
                <CardDescription data-testid="text-overdue-description">
                  These calibrations need immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table data-testid="table-overdue">
                  <TableHeader>
                    <TableRow data-testid="row-overdue-header">
                      <TableHead data-testid="header-equipment">Equipment</TableHead>
                      <TableHead data-testid="header-type">Type</TableHead>
                      <TableHead data-testid="header-serial">Serial Number</TableHead>
                      <TableHead data-testid="header-due-date">Due Date</TableHead>
                      <TableHead data-testid="header-days-overdue">Days Overdue</TableHead>
                      <TableHead data-testid="header-action">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="tbody-overdue">
                    {overdueCalibrations.map((equipment) => {
                      const dueDate = new Date(equipment.calibrationDue!);
                      const daysOverdue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={equipment.id} data-testid={`row-overdue-${equipment.id}`}>
                          <TableCell className="font-medium" data-testid={`cell-overdue-name-${equipment.id}`}>
                            {equipment.name}
                          </TableCell>
                          <TableCell data-testid={`cell-overdue-type-${equipment.id}`}>
                            {equipment.type.replace('_', ' ')}
                          </TableCell>
                          <TableCell data-testid={`cell-overdue-serial-${equipment.id}`}>
                            {equipment.serialNumber || 'N/A'}
                          </TableCell>
                          <TableCell data-testid={`cell-overdue-due-${equipment.id}`}>
                            {format(dueDate, 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell data-testid={`cell-overdue-days-${equipment.id}`}>
                            <Badge className="bg-red-500/10 text-red-700 dark:text-red-400" data-testid={`badge-overdue-${equipment.id}`}>
                              {daysOverdue} days overdue
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`cell-overdue-action-${equipment.id}`}>
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
          {!isLoading && !hasError && (
            <Card data-testid="card-upcoming">
              <CardHeader>
                <CardTitle data-testid="text-upcoming-title">
                  Upcoming Calibrations (Next 30 Days)
                </CardTitle>
                <CardDescription data-testid="text-upcoming-description">
                  Equipment requiring calibration soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingCalibrations && upcomingCalibrations.length > 0 ? (
                  <Table data-testid="table-upcoming">
                    <TableHeader>
                      <TableRow data-testid="row-upcoming-header">
                        <TableHead data-testid="header-upcoming-equipment">Equipment</TableHead>
                        <TableHead data-testid="header-upcoming-type">Type</TableHead>
                        <TableHead data-testid="header-upcoming-serial">Serial Number</TableHead>
                        <TableHead data-testid="header-upcoming-due">Due Date</TableHead>
                        <TableHead data-testid="header-upcoming-status">Status</TableHead>
                        <TableHead data-testid="header-upcoming-action">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody data-testid="tbody-upcoming">
                      {upcomingCalibrations.map((equipment) => {
                        const dueDate = new Date(equipment.calibrationDue!);
                        const status = getCalibrationStatus(dueDate);
                        return (
                          <TableRow key={equipment.id} data-testid={`row-upcoming-${equipment.id}`}>
                            <TableCell className="font-medium" data-testid={`cell-upcoming-name-${equipment.id}`}>
                              {equipment.name}
                            </TableCell>
                            <TableCell data-testid={`cell-upcoming-type-${equipment.id}`}>
                              {equipment.type.replace('_', ' ')}
                            </TableCell>
                            <TableCell data-testid={`cell-upcoming-serial-${equipment.id}`}>
                              {equipment.serialNumber || 'N/A'}
                            </TableCell>
                            <TableCell data-testid={`cell-upcoming-due-${equipment.id}`}>
                              {format(dueDate, 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell data-testid={`cell-upcoming-status-${equipment.id}`}>
                              <Badge className={`${status.color}/10 ${status.color.replace('bg-', 'text-').replace('500', '700')} dark:${status.color.replace('bg-', 'text-').replace('500', '400')}`} data-testid={`badge-upcoming-${equipment.id}`}>
                                {status.text}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`cell-upcoming-action-${equipment.id}`}>
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
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-upcoming">
                    <CheckCircle className="mx-auto h-12 w-12 mb-3 opacity-50" data-testid="icon-empty-upcoming" />
                    <p data-testid="text-empty-upcoming">No calibrations due in the next 30 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6" data-testid="tab-content-calendar">
          <Card data-testid="card-calendar">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle data-testid="text-calendar-month">
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2" data-testid="controls-calendar-nav">
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
                    onClick={goToToday}
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
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden" data-testid="grid-calendar">
                {/* Weekday headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="bg-background p-2 text-center text-sm font-medium text-muted-foreground"
                    data-testid={`header-weekday-${day.toLowerCase()}`}
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="bg-background min-h-[100px]" data-testid={`cell-empty-${index}`} />;
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
                      }`} data-testid={`day-number-${dateKey}`}>
                        {format(day, 'd')}
                      </div>
                      {dayCalibrations.length > 0 && (
                        <div className="space-y-1" data-testid={`calibrations-${dateKey}`}>
                          {dayCalibrations.slice(0, 2).map((equipment) => {
                            const status = getCalibrationStatus(new Date(equipment.calibrationDue!));
                            return (
                              <Link key={equipment.id} href={`/equipment/${equipment.id}`}>
                                <div
                                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${status.color}/20`}
                                  title={equipment.name}
                                  data-testid={`calendar-item-${equipment.id}`}
                                >
                                  <div className="truncate font-medium" data-testid={`calendar-item-name-${equipment.id}`}>
                                    {equipment.name}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                          {dayCalibrations.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1" data-testid={`calendar-more-${dateKey}`}>
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
              <div className="flex items-center gap-4 mt-4 text-sm" data-testid="legend-calendar">
                <div className="flex items-center gap-2" data-testid="legend-overdue">
                  <div className="w-3 h-3 rounded bg-red-500" data-testid="legend-color-overdue"></div>
                  <span className="text-muted-foreground" data-testid="legend-text-overdue">Overdue</span>
                </div>
                <div className="flex items-center gap-2" data-testid="legend-due-soon">
                  <div className="w-3 h-3 rounded bg-yellow-500" data-testid="legend-color-due-soon"></div>
                  <span className="text-muted-foreground" data-testid="legend-text-due-soon">Due Soon (≤7 days)</span>
                </div>
                <div className="flex items-center gap-2" data-testid="legend-upcoming">
                  <div className="w-3 h-3 rounded bg-green-500" data-testid="legend-color-upcoming"></div>
                  <span className="text-muted-foreground" data-testid="legend-text-upcoming">Upcoming</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Phase 2 - BUILD: ErrorBoundary wrapper
export default function CalibrationSchedule() {
  return (
    <ErrorBoundary>
      <CalibrationScheduleContent />
    </ErrorBoundary>
  );
}
