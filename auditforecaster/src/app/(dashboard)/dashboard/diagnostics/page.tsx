'use client';

import { useEffect, useState } from 'react';
import { getFieldLogs, FieldLog, clearFieldLogs, getMutationQueue, MutationQueueItem } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { deleteDB } from 'idb';

export default function DiagnosticsPage() {
    const [logs, setLogs] = useState<FieldLog[]>([]);
    const [queue, setQueue] = useState<MutationQueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const [l, q] = await Promise.all([getFieldLogs(), getMutationQueue()]);
            setLogs(l.reverse()); // Newest first
            setQueue(q);
        } catch (e) {
            console.error('Failed to load diagnostics', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const handleClearLogs = async () => {
        if (confirm('Clear all local logs?')) {
            await clearFieldLogs();
            refresh();
        }
    };

    const handleFactoryReset = async () => {
        if (confirm('WARNING: This will delete ALL unsynced data. Are you sure?')) {
            await deleteDB('audit-forecaster-offline');
            window.location.reload();
        }
    };

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Field Diagnostics</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={refresh} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="destructive" onClick={handleFactoryReset}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Factory Reset
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Sync Queue */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            Sync Queue
                            <Badge variant={queue.length > 0 ? 'destructive' : 'secondary'}>
                                {queue.length} Pending
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            {queue.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">Queue is empty</div>
                            ) : (
                                <div className="space-y-2">
                                    {queue.map(item => (
                                        <div key={item.id} className="p-2 border rounded text-sm">
                                            <div className="font-medium">{item.type} {item.resource}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Created: {new Date(item.createdAt).toLocaleTimeString()}
                                            </div>
                                            {item.error && (
                                                <div className="text-xs text-red-500 mt-1">Error: {item.error}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Field Logs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between">
                            Local Logs
                            <Button variant="ghost" size="sm" onClick={handleClearLogs}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            {logs.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">No logs found</div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map(log => (
                                        <div key={log.id} className={`p-2 border rounded text-sm ${log.level === 'error' ? 'bg-red-50 dark:bg-red-900/20' : ''
                                            }`}>
                                            <div className="flex justify-between">
                                                <span className={`font-bold uppercase text-xs ${log.level === 'error' ? 'text-red-500' : 'text-blue-500'
                                                    }`}>
                                                    {log.level}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <div className="mt-1">{log.message}</div>
                                            {log.details && (
                                                <pre className="mt-1 text-xs bg-muted p-1 rounded overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
