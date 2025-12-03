import { getDevFeatures, Feature } from "@/app/actions/dev";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle, Terminal } from "lucide-react";

export const metadata = {
    title: 'Development Progress | AuditForecaster',
    description: 'Track development progress and feature status',
};

function getStatusColor(status: string) {
    switch (status) {
        case 'done': return 'default'; // usually black/primary
        case 'in-progress': return 'secondary'; // usually gray/blueish
        case 'todo': return 'outline';
        case 'failed': return 'destructive';
        default: return 'outline';
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'done': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
        case 'todo': return <Circle className="h-4 w-4 text-gray-400" />;
        case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
        default: return <Circle className="h-4 w-4" />;
    }
}

export default async function ProgressDashboard() {
    const { success, data, error } = await getDevFeatures();

    if (!success || !data) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Error Loading Progress</h1>
                <p>{error || "Unknown error occurred"}</p>
            </div>
        );
    }

    const total = data.features.length;
    const done = data.features.filter(f => f.status === 'done').length;
    const progress = total > 0 ? (done / total) * 100 : 0;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Development Progress</h1>
                    <p className="text-muted-foreground">Real-time status from Agent Harness</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                    <div className="text-sm text-muted-foreground">{done} of {total} phases complete</div>
                </div>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="grid gap-4">
                {data.features.map((feature) => (
                    <Card key={feature.id} className={feature.status === 'in-progress' ? 'border-blue-500 border-2' : ''}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {getStatusIcon(feature.status)}
                                    {feature.description}
                                </CardTitle>
                                <Badge variant={getStatusColor(feature.status) as any}>
                                    {feature.status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-2 space-y-2">
                                <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Terminal className="h-3 w-3" />
                                    Verification Steps:
                                </div>
                                <ul className="list-disc list-inside text-sm space-y-1 ml-1">
                                    {feature.verification_steps.map((step, idx) => (
                                        <li key={idx} className="text-muted-foreground">{step}</li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
