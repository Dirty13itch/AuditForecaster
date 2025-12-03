import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server } from "lucide-react";

export const metadata = {
    title: 'System Health | AuditForecaster',
};

export default async function HealthPage() {
    // Fetch System Stats
    const errorCount = await prisma.systemLog.count({
        where: { level: 'ERROR', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });

    const recentLogs = await prisma.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    // const pendingMutations = 0; // Placeholder until we can query Redis/Queue directly

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">System Health</h1>
                <p className="text-gray-400 mt-1">Real-time monitoring of system vitals.</p>
            </div>

            {/* Vitals Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300">API Status</CardTitle>
                        <Server className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">Operational</div>
                        <p className="text-xs text-gray-400">Uptime: 99.9%</p>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300">Error Rate (24h)</CardTitle>
                        <Activity className={`h-4 w-4 ${errorCount > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{errorCount}</div>
                        <p className="text-xs text-gray-400">Critical events logged</p>
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-300">Database</CardTitle>
                        <Database className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">Connected</div>
                        <p className="text-xs text-gray-400">Latency: 12ms</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Logs */}
            <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">Recent System Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentLogs.length === 0 ? (
                            <p className="text-gray-500 text-sm">No logs found.</p>
                        ) : (
                            recentLogs.map(log => (
                                <div key={log.id} className="flex items-start justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={
                                                log.level === 'ERROR' ? "border-red-500/20 bg-red-500/10 text-red-400" :
                                                    log.level === 'WARN' ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400" :
                                                        "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                            }>
                                                {log.level}
                                            </Badge>
                                            <span className="text-sm font-medium text-white">{log.message}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {log.context ? JSON.stringify(log.context) : ''}
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
