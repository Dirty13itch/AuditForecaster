import { useState, useEffect } from 'react';
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

export default function ConflictResolution() {
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
  }, []);
  
  // Group conflicts when loaded
  useEffect(() => {
    const grouped: GroupedConflicts = {
      jobs: conflicts.filter(c => c.entityType === 'job'),
      photos: conflicts.filter(c => c.entityType === 'photo'),
      reports: conflicts.filter(c => c.entityType === 'report'),
    };
    setGroupedConflicts(grouped);
  }, [conflicts]);
  
  // Update merged data when field selections change
  useEffect(() => {
    if (selectedConflict && resolution === 'merge') {
      const merged = mergeFields(selectedConflict, fieldSelections);
      setMergedData(merged);
    }
  }, [selectedConflict, fieldSelections, resolution]);
  
  const loadConflicts = async () => {
    try {
      const loadedConflicts = await indexedDB.getConflicts();
      setConflicts(loadedConflicts);
    } catch (error) {
      toast({
        title: 'Failed to Load Conflicts',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  const getDifferences = (conflict: ConflictItem): FieldDifference[] => {
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
  };
  
  const mergeFields = (
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
  };
  
  const handleResolveConflict = async () => {
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
  };
  
  const handleBatchResolve = async () => {
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
  };
  
  const handleAutoMerge = () => {
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
  };
  
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return format(value, 'PPp');
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  const conflictCount = conflicts.length;
  const hasConflicts = conflictCount > 0;
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Conflict Resolution</h1>
        <p className="text-muted-foreground">
          Resolve data conflicts between local and remote versions
        </p>
      </div>
      
      {/* Summary */}
      <div className="grid gap-4 mb-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conflictCount}</div>
            {conflictCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Requires resolution
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-medium">{groupedConflicts.jobs.length}</span>
                <span className="text-muted-foreground ml-1">Jobs</span>
              </div>
              <div>
                <span className="font-medium">{groupedConflicts.photos.length}</span>
                <span className="text-muted-foreground ml-1">Photos</span>
              </div>
              <div>
                <span className="font-medium">{groupedConflicts.reports.length}</span>
                <span className="text-muted-foreground ml-1">Reports</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBatchMode(!batchMode)}
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
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Conflicts</h3>
            <p className="text-muted-foreground">
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conflict List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Conflicts</CardTitle>
                {batchMode && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedConflictIds(new Set(conflicts.map(c => c.id)))}
                      data-testid="button-select-all"
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedConflictIds(new Set())}
                      data-testid="button-clear-selection"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <Accordion type="single" collapsible className="w-full">
                    {Object.entries(groupedConflicts).map(([type, items]) => {
                      if (items.length === 0) return null;
                      
                      return (
                        <AccordionItem key={type} value={type}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center justify-between w-full pr-2">
                              <span className="capitalize">{type}</span>
                              <Badge variant="secondary" className="text-xs">
                                {items.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
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
                                  onClick={() => !batchMode && setSelectedConflict(conflict)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1 flex-1">
                                      {batchMode && (
                                        <div className="mb-2">
                                          <Checkbox
                                            checked={selectedConflictIds.has(conflict.id)}
                                            onCheckedChange={(checked) => {
                                              const newIds = new Set(selectedConflictIds);
                                              if (checked) {
                                                newIds.add(conflict.id);
                                              } else {
                                                newIds.delete(conflict.id);
                                              }
                                              setSelectedConflictIds(newIds);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            data-testid={`checkbox-conflict-${conflict.id}`}
                                          />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                                        <span className="text-sm font-medium">
                                          {conflict.entityId.slice(0, 8)}...
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {format(new Date(conflict.detectedAt), 'PPp')}
                                      </div>
                                    </div>
                                    {!batchMode && (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
          <div className="lg:col-span-2">
            {batchMode ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Batch Resolution</CardTitle>
                  <CardDescription>
                    Resolve multiple conflicts at once
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm font-medium mb-2">
                      {selectedConflictIds.size} conflicts selected
                    </p>
                    {selectedConflictIds.size > 0 && (
                      <p className="text-xs text-muted-foreground">
                        This will apply the same resolution strategy to all selected conflicts
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Resolution Strategy</h4>
                    <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ConflictResolutionType)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="remote" id="batch-remote" />
                        <Label htmlFor="batch-remote">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Use Remote Version</span>
                            <span className="text-xs text-muted-foreground">(Server data wins)</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="local" id="batch-local" />
                        <Label htmlFor="batch-local">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span>Use Local Version</span>
                            <span className="text-xs text-muted-foreground">(Your changes win)</span>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="batch-both" />
                        <Label htmlFor="batch-both">
                          <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            <span>Keep Both Versions</span>
                            <span className="text-xs text-muted-foreground">(Creates duplicate)</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="flex gap-2">
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
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Conflict Details</CardTitle>
                  <CardDescription>
                    Entity: {selectedConflict.entityType} - {selectedConflict.entityId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="comparison" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="comparison">Comparison</TabsTrigger>
                      <TabsTrigger value="resolution">Resolution</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="comparison" className="space-y-4">
                      <ScrollArea className="h-[450px] pr-4">
                        <div className="space-y-4">
                          {getDifferences(selectedConflict).map(diff => (
                            <div
                              key={diff.field}
                              className={cn(
                                'p-3 rounded-lg border',
                                diff.isDifferent ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{diff.field}</span>
                                {diff.isDifferent && (
                                  <Badge variant="outline" className="text-xs">
                                    Different
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Local</div>
                                  <code className="text-xs bg-muted p-2 rounded block">
                                    {formatValue(diff.localValue)}
                                  </code>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Remote</div>
                                  <code className="text-xs bg-muted p-2 rounded block">
                                    {formatValue(diff.remoteValue)}
                                  </code>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="resolution" className="space-y-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Resolution Strategy</h4>
                        <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as ConflictResolutionType)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="remote" id="remote" />
                            <Label htmlFor="remote">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                <span>Use Remote Version</span>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="local" id="local" />
                            <Label htmlFor="local">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                <span>Use Local Version</span>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="merge" id="merge" />
                            <Label htmlFor="merge">
                              <div className="flex items-center gap-2">
                                <GitMerge className="h-4 w-4" />
                                <span>Manual Merge</span>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id="both" />
                            <Label htmlFor="both">
                              <div className="flex items-center gap-2">
                                <Copy className="h-4 w-4" />
                                <span>Keep Both Versions</span>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        {resolution === 'merge' && (
                          <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-medium">Field Selection</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleAutoMerge}
                                data-testid="button-auto-merge"
                              >
                                Auto-merge
                              </Button>
                            </div>
                            <ScrollArea className="h-[250px] pr-4">
                              <div className="space-y-2">
                                {getDifferences(selectedConflict)
                                  .filter(d => d.isDifferent)
                                  .map(diff => (
                                    <div
                                      key={diff.field}
                                      className="p-2 rounded border"
                                    >
                                      <div className="text-sm font-medium mb-2">{diff.field}</div>
                                      <RadioGroup
                                        value={fieldSelections.get(diff.field) || 'remote'}
                                        onValueChange={(value) => {
                                          const newSelections = new Map(fieldSelections);
                                          newSelections.set(diff.field, value as 'local' | 'remote');
                                          setFieldSelections(newSelections);
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="local" id={`${diff.field}-local`} />
                                          <Label htmlFor={`${diff.field}-local`} className="text-xs">
                                            Local: {formatValue(diff.localValue).substring(0, 50)}
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="remote" id={`${diff.field}-remote`} />
                                          <Label htmlFor={`${diff.field}-remote`} className="text-xs">
                                            Remote: {formatValue(diff.remoteValue).substring(0, 50)}
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    </div>
                                  ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="preview" className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <h4 className="text-sm font-medium mb-2">Result Preview</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          This is how the data will look after resolution
                        </p>
                        <ScrollArea className="h-[350px]">
                          <pre className="text-xs">
                            {JSON.stringify(
                              resolution === 'local' ? selectedConflict.localData :
                              resolution === 'remote' ? selectedConflict.remoteData :
                              resolution === 'merge' ? mergedData :
                              { local: selectedConflict.localData, remote: selectedConflict.remoteData },
                              null,
                              2
                            )}
                          </pre>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResolveConflict}
                      disabled={isResolving}
                      data-testid="button-resolve"
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
                    <Button
                      variant="outline"
                      onClick={() => setSelectedConflict(null)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Conflict</h3>
                  <p className="text-muted-foreground">
                    Choose a conflict from the list to view details and resolve
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