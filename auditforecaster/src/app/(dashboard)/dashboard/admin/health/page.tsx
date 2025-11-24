import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { Activity, Database, Server, AlertCircle } from "lucide-react";

export const metadata = {
    title: 'System Health | AuditForecaster',
    description: 'Monitor system health and performance metrics',
};

async function getDatabaseStatus() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: "healthy", message: "Connected" };
    } catch (err) {
        console.error('Database connection error:', err);
        return { status: "error", message: "Connection failed" };
    }
}

async function getSystemMetrics() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
        uptime: Math.floor(uptime / 60), // minutes
        memoryMB: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
    };
}

async function getRecentErrors() {
    // In production, this would query an error logging table or Sentry
    // For now, return empty array
    return [];
}

interface ErrorLog {
    message: string;
    timestamp: string;
}

export default async function HealthDashboard() {
    const dbStatus = await getDatabaseStatus();
    const metrics = await getSystemMetrics();
    const errors: ErrorLog[] = await getRecentErrors();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${dbStatus.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                            {dbStatus.status === 'healthy' ? '✓' : '✗'}
                        </div>
                        <p className="text-xs text-muted-foreground">{dbStatus.message}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.uptime}m</div>
                        <p className="text-xs text-muted-foreground">Since last restart</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.memoryMB} MB</div>
                        <p className="text-xs text-muted-foreground">of {metrics.memoryTotalMB} MB</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Recent Errors
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {errors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent errors</p>
                    ) : (
                        <ul className="space-y-2">
                            {errors.map((error, i) => (
                                <li key={i} className="text-sm border-l-2 border-red-500 pl-2">
                                    {error.message}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <a href="/api/health" target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">
                        → Health Check Endpoint
                    </a>
                    <a href="/api/metrics" target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 hover:underline">
                        → Prometheus Metrics
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
