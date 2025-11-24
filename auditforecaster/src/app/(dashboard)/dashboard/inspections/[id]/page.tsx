import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, FileText, Camera, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import Image from "next/image";

// Types for inspection data and checklist items
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

    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                include: {
                    photos: true,
                    reportTemplate: true,
                },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
    });

    if (!job) {
        notFound();
    }

    // If no inspection exists yet, redirect to create one
    if (job.inspections.length === 0) {
        redirect(`/inspections/${id}`);
        return null; // satisfies TypeScript
    }

    const inspection = job.inspections[0];
    const inspectionData: InspectionData = inspection.data ? JSON.parse(inspection.data) : {};
    const checklist: ChecklistItem[] = inspection.checklist ? JSON.parse(inspection.checklist) : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={`/dashboard/jobs/${id}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Inspection Details</h1>
                        <p className="text-gray-500">{job.address}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/reports/${id}`}>
                        <Button variant="outline">
                            <FileText className="mr-2 h-4 w-4" />
                            View Report
                        </Button>
                    </Link>
                    <Link href={`/inspections/${id}`}>
                        <Button>Edit Inspection</Button>
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
                            <div className="text-sm font-medium text-gray-500">Type</div>
                            <div className="font-semibold">{inspection.type.replace("_", " ")}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Inspector</div>
                            <div>{job.inspector?.name || "N/A"}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Completed</div>
                            <div>{format(new Date(inspection.createdAt), "MMM dd, yyyy")}</div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Photos</div>
                            <div>{inspection.photos.length} uploaded</div>
                        </div>
                    </div>
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
                                <div className="text-sm font-medium text-gray-500">CFM50</div>
                                <div className="text-2xl font-bold">{inspectionData.cfm50}</div>
                            </div>
                            {inspectionData.ach50 && (
                                <div>
                                    <div className="text-sm font-medium text-gray-500">ACH50</div>
                                    <div className="text-2xl font-bold">{inspectionData.ach50}</div>
                                </div>
                            )}
                            {inspectionData.notes && (
                                <div className="col-span-2 md:col-span-3">
                                    <div className="text-sm font-medium text-gray-500 mb-2">Notes</div>
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
                </Card>
            )}

            {/* Photos */}
            {inspection.photos.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5" />
                            Photos ({inspection.photos.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {inspection.photos.map((photo) => (
                                <div key={photo.id} className="space-y-2">
                                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                                        <Image
                                            src={photo.url}
                                            alt={photo.caption || "Inspection photo"}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                        />
                                    </div>
                                    {photo.caption && <p className="text-sm text-gray-600">{photo.caption}</p>}
                                    {photo.category && (
                                        <Badge variant="outline" className="text-xs">
                                            {photo.category}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Digital Signature */}
            {inspection.signatureUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle>Digital Signature</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white border rounded-lg p-4 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={inspection.signatureUrl} alt="Inspector signature" className="max-w-xs" />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Signed by {job.inspector?.name} on {format(new Date(inspection.createdAt), "MMMM dd, yyyy")}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
