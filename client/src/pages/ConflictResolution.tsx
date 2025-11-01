import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Database,
  Eye,
  GitMerge,
  Globe,
  Layers,
  RefreshCw,
  Save,
  Undo,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { indexedDB, ConflictItem, ConflictResolution as ConflictResolutionType } from '@/utils/indexedDB';
import { syncQueue, resolveConflict } from '@/utils/syncQueue';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupedConflicts {
  jobs: ConflictItem[];
  photos: ConflictItem[];
  reports: ConflictItem[];
}

interface FieldDifference {
  field: string;
  localValue: any;
  remoteValue: any;
  isDifferent: boolean;
  isMergeable: boolean;
}

/**
 * Phase 2 - BUILD: ConflictResolutionContent component
 * 
 * Main component wrapped in ErrorBoundary at export.
 * Manages offline sync conflicts between local and remote data.
 */
function ConflictResolutionContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [groupedConflicts, setGroupedConflicts] = useState<GroupedConflicts>({
    jobs: [],
    photos: [],
    reports: [],
  });
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);
  const [resolution, setResolution] = useState<ConflictResolutionType>('remote');
  const [mergedData, setMergedData] = useState<any>(null);
  const [fieldSelections, setFieldSelections] = useState<Map<string, 'local' | 'remote'>>(new Map());
  const [isResolving, setIsResolving] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedConflictIds, setSelectedConflictIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for loading conflicts
   * 
   * Loads conflicts from IndexedDB and handles loading/error states
   */
  const loadConflicts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const loadedConflicts = await indexedDB.getConflicts();
      setConflicts(loadedConflicts);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load conflicts');
      setLoadError(err);
      toast({
        title: 'Failed to Load Conflicts',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Load conflicts on mount
  useEffect(() => {
    loadConflicts();
    
    // Subscribe to conflict events
    const unsubscribe = syncQueue.subscribe((event) => {
      if (event.type === 'conflict-detected') {
        loadConflicts();
      }
    });
    
    return unsubscribe;
  }, [loadConflicts]);
  
  // Group conflicts when loaded
  useEffect(() => {
    const grouped: GroupedConflicts = {
      jobs: conflicts.filter(c => c.entityType === 'job'),
      photos: conflicts.filter(c => c.entityType === 'photo'),
      reports: conflicts.filter(c => c.entityType === 'report'),
    };
    setGroupedConflicts(grouped);
  }, [conflicts]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for getting field differences
   */
  const getDifferences = useCallback((conflict: ConflictItem): FieldDifference[] => {
    const differences: FieldDifference[] = [];
    const localKeys = Object.keys(conflict.localData || {});
    const remoteKeys = Object.keys(conflict.remoteData || {});
    const allKeys = new Set([...localKeys, ...remoteKeys]);
    
    for (const field of allKeys) {
      const localValue = conflict.localData?.[field];
      const remoteValue = conflict.remoteData?.[field];
      const isDifferent = JSON.stringify(localValue) !== JSON.stringify(remoteValue);
      const isMergeable = typeof localValue !== 'object' || Array.isArray(localValue);
      
      differences.push({
        field,
        localValue,
        remoteValue,
        isDifferent,
        isMergeable,
      });
    }
    
    return differences.sort((a, b) => {
      // Sort differences first
      if (a.isDifferent && !b.isDifferent) return -1;
      if (!a.isDifferent && b.isDifferent) return 1;
      return a.field.localeCompare(b.field);
    });
  }, []);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for merging fields
   */
  const mergeFields = useCallback((
    conflict: ConflictItem,
    selections: Map<string, 'local' | 'remote'>
  ): any => {
    const merged: any = {};
    const differences = getDifferences(conflict);
    
    for (const diff of differences) {
      const selection = selections.get(diff.field) || 'remote';
      merged[diff.field] = selection === 'local' ? diff.localValue : diff.remoteValue;
    }
    
    return merged;
  }, [getDifferences]);
  
  // Update merged data when field selections change
  useEffect(() => {
    if (selectedConflict && resolution === 'merge') {
      const merged = mergeFields(selectedConflict, fieldSelections);
      setMergedData(merged);
    }
  }, [selectedConflict, fieldSelections, resolution, mergeFields]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for resolving single conflict
   */
  const handleResolveConflict = useCallback(async () => {
    if (!selectedConflict) return;
    
    setIsResolving(true);
    
    try {
      let dataToUse = null;
      
      if (resolution === 'merge') {
        dataToUse = mergedData;
      }
      
      await resolveConflict(selectedConflict.id, resolution, dataToUse);
      
      toast({
        title: 'Conflict Resolved',
        description: `Conflict resolved using ${resolution} strategy`,
      });
      
      // Reload conflicts
      await loadConflicts();
      
      // Clear selection
      setSelectedConflict(null);
      setFieldSelections(new Map());
      setMergedData(null);
    } catch (error) {
      toast({
        title: 'Resolution Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
    }
  }, [selectedConflict, resolution, mergedData, toast, loadConflicts]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for batch resolution
   */
  const handleBatchResolve = useCallback(async () => {
    if (selectedConflictIds.size === 0) {
      toast({
        title: 'No Conflicts Selected',
        description: 'Please select conflicts to resolve in batch',
        variant: 'destructive',
      });
      return;
    }
    
    setIsResolving(true);
    
    try {
      const selectedConflicts = conflicts.filter(c => selectedConflictIds.has(c.id));
      
      for (const conflict of selectedConflicts) {
        await resolveConflict(conflict.id, resolution, null);
      }
      
      toast({
        title: 'Batch Resolution Complete',
        description: `Resolved ${selectedConflictIds.size} conflicts using ${resolution} strategy`,
      });
      
      // Reload conflicts
      await loadConflicts();
      
      // Clear selections
      setSelectedConflictIds(new Set());
      setBatchMode(false);
    } catch (error) {
      toast({
        title: 'Batch Resolution Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsResolving(false);
    }
  }, [selectedConflictIds, conflicts, resolution, toast, loadConflicts]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for auto-merge
   */
  const handleAutoMerge = useCallback(() => {
    if (!selectedConflict) return;
    
    const differences = getDifferences(selectedConflict);
    const newSelections = new Map<string, 'local' | 'remote'>();
    
    for (const diff of differences) {
      if (diff.isDifferent) {
        // Use remote for conflicts by default
        newSelections.set(diff.field, 'remote');
      } else {
        // Use remote for identical fields
        newSelections.set(diff.field, 'remote');
      }
    }
    
    setFieldSelections(newSelections);
    setResolution('merge');
  }, [selectedConflict, getDifferences]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for formatting values
   */
  const formatValue = useCallback((value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return format(value, 'PPp');
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }, []);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for toggling batch mode
   */
  const handleToggleBatchMode = useCallback(() => {
    setBatchMode(!batchMode);
  }, [batchMode]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for selecting all conflicts
   */
  const handleSelectAll = useCallback(() => {
    setSelectedConflictIds(new Set(conflicts.map(c => c.id)));
  }, [conflicts]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for clearing selection
   */
  const handleClearSelection = useCallback(() => {
    setSelectedConflictIds(new Set());
  }, []);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for handling conflict checkbox change
   */
  const handleConflictCheckboxChange = useCallback((conflictId: string, checked: boolean) => {
    const newIds = new Set(selectedConflictIds);
    if (checked) {
      newIds.add(conflictId);
    } else {
      newIds.delete(conflictId);
    }
    setSelectedConflictIds(newIds);
  }, [selectedConflictIds]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized callback for selecting conflict
   */
  const handleSelectConflict = useCallback((conflict: ConflictItem) => {
    if (!batchMode) {
      setSelectedConflict(conflict);
    }
  }, [batchMode]);
  
  /**
   * Phase 3 - OPTIMIZE: Memoized conflict count
   */
  const conflictCount = useMemo(() => conflicts.length, [conflicts]);
  const hasConflicts = useMemo(() => conflictCount > 0, [conflictCount]);
  
  /**
   * Phase 2 - BUILD: Loading state with skeleton loaders
   */
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-conflict-resolution-loading">
        <div className="mb-6">
          <Skeleton className="h-9 w-64 mb-2" data-testid="skeleton-title" />
          <Skeleton className="h-5 w-96" data-testid="skeleton-description" />
        </div>
        
        <div className="grid gap-4 mb-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} data-testid={`skeleton-summary-card-${i}`}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" data-testid={`skeleton-card-title-${i}`} />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" data-testid={`skeleton-card-value-${i}`} />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" data-testid="skeleton-conflict-list-title" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" data-testid={`skeleton-conflict-${i}`} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-48" data-testid="skeleton-details-title" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full" data-testid="skeleton-details-content" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  /**
   * Phase 2 - BUILD: Error state with retry button
   */
  if (loadError) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-conflict-resolution-error">
        <Alert variant="destructive" data-testid="alert-load-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Failed to load conflicts</p>
              <p className="text-sm mt-1">{loadError.message}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadConflicts}
              data-testid="button-retry-load"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-conflict-resolution">
      {/* Header */}
      <div className="mb-6" data-testid="section-header">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Conflict Resolution</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Resolve data conflicts between local and remote versions
        </p>
      </div>
      
      {/* Summary */}
      <div className="grid gap-4 mb-6 md:grid-cols-3" data-testid="section-summary">
        <Card data-testid="card-total-conflicts">
          <CardHeader className="pb-3">
            <CardTitle className="text-base" data-testid="text-total-conflicts-title">Total Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-conflicts-count">{conflictCount}</div>
            {conflictCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-requires-resolution">
                Requires resolution
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card data-testid="card-by-type">
          <CardHeader className="pb-3">
            <CardTitle className="text-base" data-testid="text-by-type-title">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm" data-testid="section-type-counts">
              <div data-testid="count-jobs">
                <span className="font-medium" data-testid="text-jobs-count">{groupedConflicts.jobs.length}</span>
                <span className="text-muted-foreground ml-1" data-testid="text-jobs-label">Jobs</span>
              </div>
              <div data-testid="count-photos">
                <span className="font-medium" data-testid="text-photos-count">{groupedConflicts.photos.length}</span>
                <span className="text-muted-foreground ml-1" data-testid="text-photos-label">Photos</span>
              </div>
              <div data-testid="count-reports">
                <span className="font-medium" data-testid="text-reports-count">{groupedConflicts.reports.length}</span>
                <span className="text-muted-foreground ml-1" data-testid="text-reports-label">Reports</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-actions">
          <CardHeader className="pb-3">
            <CardTitle className="text-base" data-testid="text-actions-title">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2" data-testid="section-action-buttons">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleBatchMode}
                disabled={!hasConflicts}
                data-testid="button-batch-mode"
              >
                <Layers className="mr-2 h-4 w-4" />
                Batch Mode
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadConflicts}
                data-testid="button-refresh"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {!hasConflicts ? (
        <Card className="text-center py-12" data-testid="card-no-conflicts">
          <CardContent>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" data-testid="icon-no-conflicts" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-conflicts-title">No Conflicts</h3>
            <p className="text-muted-foreground" data-testid="text-no-conflicts-message">
              All data is synchronized successfully
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate('/jobs')}
              data-testid="button-back-to-jobs"
            >
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3" data-testid="section-conflict-resolution">
          {/* Conflict List */}
          <div className="lg:col-span-1" data-testid="section-conflict-list">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="text-conflicts-title">Conflicts</CardTitle>
                {batchMode && (
                  <div className="flex gap-2 mt-2" data-testid="section-batch-actions">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAll}
                      data-testid="button-select-all"
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearSelection}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4" data-testid="scroll-conflicts">
                  <Accordion type="single" collapsible className="w-full" data-testid="accordion-conflicts">
                    {Object.entries(groupedConflicts).map(([type, items]) => {
                      if (items.length === 0) return null;
                      
                      return (
                        <AccordionItem key={type} value={type} data-testid={`accordion-item-${type}`}>
                          <AccordionTrigger className="text-sm" data-testid={`accordion-trigger-${type}`}>
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="capitalize" data-testid={`text-type-${type}`}>{type}</span>
                              <Badge variant="secondary" className="text-xs" data-testid={`badge-count-${type}`}>
                                {items.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent data-testid={`accordion-content-${type}`}>
                            <div className="space-y-2">
                              {items.map(conflict => (
                                <div
                                  key={conflict.id}
                                  className={cn(
                                    'p-3 rounded-lg border cursor-pointer transition-colors',
                                    selectedConflict?.id === conflict.id
                                      ? 'bg-primary/10 border-primary'
                                      : 'hover:bg-muted'
                                  )}
                                  onClick={() => handleSelectConflict(conflict)}
                                  data-testid={`conflict-item-${conflict.id}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                      {batchMode && (
                                        <div className="mb-2">
                                          <Checkbox
                                            checked={selectedConflictIds.has(conflict.id)}
                                            onCheckedChange={(checked) => handleConflictCheckboxChange(conflict.id, !!checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`checkbox-conflict-${conflict.id}`}
                                          />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3 text-yellow-500" data-testid={`icon-warning-${conflict.id}`} />
                                        <span className="text-sm font-medium" data-testid={`text-entity-id-${conflict.id}`}>
                                          {conflict.entityId.slice(0, 8)}...
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground" data-testid={`text-detected-at-${conflict.id}`}>
                                        {format(new Date(conflict.detectedAt), 'PPp')}
                                      </div>
                                    </div>
                                    {!batchMode && (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" data-testid={`icon-chevron-${conflict.id}`} />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          
          {/* Conflict Details */}
          <div className="lg:col-span-2" data-testid="section-conflict-details">
            {batchMode ? (
              <Card className="h-full" data-testid="card-batch-resolution">
                <CardHeader>
                  <CardTitle className="text-lg" data-testid="text-batch-resolution-title">Batch Resolution</CardTitle>
                  <CardDescription data-testid="text-batch-resolution-description">
                    Resolve multiple conflicts at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted" data-testid="section-batch-summary">
                    <p className="text-sm font-medium mb-2" data-testid="text-selected-count">
                      {selectedConflictIds.size} conflicts selected
                    </p>
                    {selectedConflictIds.size > 0 && (
                      <p className="text-xs text-muted-foreground" data-testid="text-batch-info">
                        This will apply the same resolution strategy to all selected conflicts
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4" data-testid="section-resolution-strategy">
                    <h4 className="text-sm font-medium" data-testid="text-strategy-title">Resolution Strategy</h4>
                    <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ConflictResolutionType)}>
                      <div className="flex items-center space-x-2" data-testid="radio-remote">
                        <RadioGroupItem value="remote" id="batch-remote" data-testid="radio-input-remote" />
                        <Label htmlFor="batch-remote" data-testid="label-remote">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Use Remote Version</span>
                            <span className="text-xs text-muted-foreground">(Server data wins)</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2" data-testid="radio-local">
                        <RadioGroupItem value="local" id="batch-local" data-testid="radio-input-local" />
                        <Label htmlFor="batch-local" data-testid="label-local">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span>Use Local Version</span>
                            <span className="text-xs text-muted-foreground">(Your changes win)</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2" data-testid="radio-both">
                        <RadioGroupItem value="both" id="batch-both" data-testid="radio-input-both" />
                        <Label htmlFor="batch-both" data-testid="label-both">
                          <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            <span>Keep Both Versions</span>
                            <span className="text-xs text-muted-foreground">(Creates duplicate)</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="flex gap-2" data-testid="section-batch-buttons">
                    <Button
                      onClick={handleBatchResolve}
                      disabled={selectedConflictIds.size === 0 || isResolving}
                      data-testid="button-batch-resolve"
                    >
                      {isResolving ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Resolving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Resolve {selectedConflictIds.size} Conflicts
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setBatchMode(false)}
                      data-testid="button-cancel-batch"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : selectedConflict ? (
              <Card className="h-full" data-testid="card-conflict-details">
                <CardHeader>
                  <CardTitle className="text-lg" data-testid="text-conflict-details-title">Conflict Details</CardTitle>
                  <CardDescription data-testid="text-conflict-entity">
                    Entity: {selectedConflict.entityType} - {selectedConflict.entityId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="comparison" className="w-full" data-testid="tabs-conflict-details">
                    <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list">
                      <TabsTrigger value="comparison" data-testid="tab-comparison">Comparison</TabsTrigger>
                      <TabsTrigger value="resolution" data-testid="tab-resolution">Resolution</TabsTrigger>
                      <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="comparison" className="space-y-4" data-testid="tab-content-comparison">
                      <ScrollArea className="h-[450px] pr-4" data-testid="scroll-comparison">
                        <div className="space-y-4">
                          {getDifferences(selectedConflict).map((diff, idx) => (
                            <div
                              key={diff.field}
                              className={cn(
                                'p-3 rounded-lg border',
                                diff.isDifferent ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950' : 'border-gray-200'
                              )}
                              data-testid={`diff-field-${idx}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm" data-testid={`text-field-name-${idx}`}>{diff.field}</span>
                                {diff.isDifferent && (
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-different-${idx}`}>
                                    Different
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div data-testid={`local-value-${idx}`}>
                                  <div className="text-xs text-muted-foreground mb-1">Local</div>
                                  <code className="text-xs break-all">{formatValue(diff.localValue)}</code>
                                </div>
                                <div data-testid={`remote-value-${idx}`}>
                                  <div className="text-xs text-muted-foreground mb-1">Remote</div>
                                  <code className="text-xs break-all">{formatValue(diff.remoteValue)}</code>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="resolution" className="space-y-4" data-testid="tab-content-resolution">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2" data-testid="text-resolution-strategy-title">Resolution Strategy</h4>
                          <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ConflictResolutionType)}>
                            <div className="flex items-center space-x-2" data-testid="radio-single-remote">
                              <RadioGroupItem value="remote" id="single-remote" data-testid="radio-input-single-remote" />
                              <Label htmlFor="single-remote" data-testid="label-single-remote">Use Remote Version</Label>
                            </div>
                            <div className="flex items-center space-x-2" data-testid="radio-single-local">
                              <RadioGroupItem value="local" id="single-local" data-testid="radio-input-single-local" />
                              <Label htmlFor="single-local" data-testid="label-single-local">Use Local Version</Label>
                            </div>
                            <div className="flex items-center space-x-2" data-testid="radio-single-merge">
                              <RadioGroupItem value="merge" id="single-merge" data-testid="radio-input-single-merge" />
                              <Label htmlFor="single-merge" data-testid="label-single-merge">Merge Fields</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={handleResolveConflict}
                            disabled={isResolving}
                            data-testid="button-resolve-conflict"
                          >
                            {isResolving ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Resolving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Resolve Conflict
                              </>
                            )}
                          </Button>
                          {resolution === 'merge' && (
                            <Button
                              variant="outline"
                              onClick={handleAutoMerge}
                              data-testid="button-auto-merge"
                            >
                              <GitMerge className="mr-2 h-4 w-4" />
                              Auto Merge
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="preview" className="space-y-4" data-testid="tab-content-preview">
                      <ScrollArea className="h-[450px] pr-4" data-testid="scroll-preview">
                        <pre className="text-xs p-4 bg-muted rounded-lg" data-testid="text-preview-data">
                          {JSON.stringify(
                            resolution === 'merge' ? mergedData :
                            resolution === 'local' ? selectedConflict.localData :
                            selectedConflict.remoteData,
                            null,
                            2
                          )}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center" data-testid="card-no-selection">
                <CardContent className="text-center py-12">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" data-testid="icon-no-selection" />
                  <p className="text-muted-foreground" data-testid="text-select-conflict">
                    Select a conflict to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phase 2 - BUILD: ErrorBoundary wrapper for ConflictResolution
 * 
 * Catches and handles React errors gracefully, preventing full page crashes.
 * Provides user-friendly error message with reload option.
 */
export default function ConflictResolution() {
  return (
    <ErrorBoundary>
      <ConflictResolutionContent />
    </ErrorBoundary>
  );
}
