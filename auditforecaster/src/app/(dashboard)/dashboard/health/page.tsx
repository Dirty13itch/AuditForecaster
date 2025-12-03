'use client';

import { useEffect, useState } from 'react';
import { checkSystemHealth, SystemHealth } from '@/app/actions/health';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSystemHealth().then(data => {
            setHealth(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!health) return null;

    return (
        <div className="space-y-6 p-8">
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Database */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database</CardTitle>
                        {health.database === 'healthy' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{health.database}</div>
                        <p className="text-xs text-muted-foreground">PostgreSQL Connection</p>
                    </CardContent>
                </Card>

                {/* Redis */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Redis Cache</CardTitle>
                        {health.redis === 'healthy' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : health.redis === 'not-configured' ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{health.redis.replace('-', ' ')}</div>
                        <p className="text-xs text-muted-foreground">Rate Limiting & Caching</p>
                    </CardContent>
                </Card>

                {/* Version */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">App Version</CardTitle>
                        <Badge variant="outline">v{health.version}</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Production</div>
                        <p className="text-xs text-muted-foreground">Current Build</p>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Integrations Status</h2>
            <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(health.integrations).map(([key, active]) => (
                    <Card key={key} className={active ? 'border-green-200 bg-green-50/10' : 'border-yellow-200 bg-yellow-50/10'}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </CardTitle>
                            {active ? (
                                <Badge className="bg-green-500">Active</Badge>
                            ) : (
                                <Badge variant="secondary" className="text-yellow-600 bg-yellow-100">Mock Mode</Badge>
                            )}
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">
                                {active
                                    ? 'Connected to external API'
                                    : 'Using internal simulation (Add API Key to enable)'}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
