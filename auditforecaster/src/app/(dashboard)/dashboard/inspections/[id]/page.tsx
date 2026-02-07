import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, FileText, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { safeJsonParse } from "@/lib/utils";

interface InspectionData {
    cfm50?: number;
    ach50?: number;
    notes?: string;
}

interface ChecklistItem {
    label?: string;
    name?: string;
    status: "PASS" | "FAIL" | "NA";
    notes?: string;
}

export default async function InspectionDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const inspection = await prisma.inspection.findUnique({
        where: { id },
        include: {
            photos: true,
            reportTemplate: true,
            job: {
                include: {
                    builder: true,
                    inspector: true,
                },
            },
        },
    });

    if (!inspection) {
        notFound();
    }

    const job = inspection.job;
    const inspectionData: InspectionData = safeJsonParse<InspectionData>(inspection.data, {});
    const checklist: ChecklistItem[] = safeJsonParse<ChecklistItem[]>(inspection.checklist, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/inspections">
                        <Button variant="ghost" size="icon" aria-label="Go back">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inspection Details</h1>
                        <p className="text-muted-foreground">{job.streetAddress}, {job.city}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/reports/${job.id}`}>
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            View Report
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Inspection Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Inspection Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Type</div>
                            <div className="font-semibold">{inspection.type.replace("_", " ")}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Inspector</div>
                            <div>{job.inspector?.name || "N/A"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Completed</div>
                            <div>{format(new Date(inspection.createdAt), "MMM dd, yyyy")}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Photos</div>
                            <div>{inspection.photos.length} uploaded</div>
                        </div>
                    </div>
                    {job.builder && (
                        <div>
                            <div className="text-sm font-medium text-muted-foreground">Builder</div>
                            <div>{job.builder.name}</div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Test Results */}
            {inspectionData.cfm50 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Blower Door Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">CFM50</div>
                                <div className="text-2xl font-bold">{inspectionData.cfm50}</div>
                            </div>
                            {inspectionData.ach50 && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">ACH50</div>
                                    <div className="text-2xl font-bold">{inspectionData.ach50}</div>
                                </div>
                            )}
                            {inspectionData.notes && (
                                <div className="col-span-2 md:col-span-3">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">Notes</div>
                                    <div className="text-gray-700">{inspectionData.notes}</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Inspection Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {checklist.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {item.status === "PASS" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                        {item.status === "FAIL" && <XCircle className="h-5 w-5 text-red-600" />}
                                        {item.status === "NA" && <MinusCircle className="h-5 w-5 text-gray-400" />}
                                        <span className="font-medium">{item.label || item.name}</span>
                                    </div>
                                    <Badge
                                        variant={
                                            item.status === "PASS"
                                                ? "default"
                                                : item.status === "FAIL"
                                                    ? "destructive"
                                                    : "secondary"
                                        }
                                    >
                                        {item.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    {inspection.signatureUrl && (
                        <CardContent>
                            <div className="bg-white border rounded-lg p-4 inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={inspection.signatureUrl} alt="Inspector signature" className="max-w-xs" />
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                                Signed by {job.inspector?.name} on {format(new Date(inspection.createdAt), "MMMM dd, yyyy")}
                            </p>
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    );
}
