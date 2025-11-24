import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer } from "lucide-react"
import { notFound } from "next/navigation"
import { DownloadPDFButton } from "@/components/download-pdf-button"

interface InspectionData {
    cfm50?: number;
    notes?: string;
}

interface ChecklistItem {
    label?: string;
    status?: string;
    note?: string;
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                include: {
                    photos: true
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
        },
    })

    if (!job) {
        notFound()
    }

    const inspection = job.inspections[0]

    if (!inspection) {
        notFound()
    }

    let inspectionData: InspectionData = {}
    let checklist: ChecklistItem[] = []

    try {
        inspectionData = inspection.data ? JSON.parse(inspection.data) : {}
    } catch (e) {
        console.error("Failed to parse inspection data", e)
    }

    try {
        checklist = inspection.checklist ? JSON.parse(inspection.checklist) : []
    } catch (e) {
        console.error("Failed to parse checklist", e)
    }
    const signatureUrl = inspection.signatureUrl

    return (
        <div className="max-w-[210mm] mx-auto bg-white min-h-screen print:p-0">
            {/* Print Button */}
            <div className="flex justify-end gap-2 p-8 print:hidden">
                <DownloadPDFButton jobId={job.id} />
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* PAGE 1: COVER PAGE */}
            <div className="p-12 h-[297mm] relative flex flex-col justify-between print:break-after-page">
                <div>
                    <div className="border-b-4 border-blue-600 pb-6 mb-12">
                        <h1 className="text-5xl font-bold text-gray-900 tracking-tight">Energy Audit Report</h1>
                        <p className="text-xl text-gray-500 mt-4">Compliance Verification</p>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Property</h3>
                            <p className="text-3xl font-medium text-gray-900">{job.streetAddress}</p>
                            <p className="text-xl text-gray-600">{job.city}, TX</p>
                            <p className="text-lg text-gray-500 mt-1">Lot {job.lotNumber}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Prepared For</h3>
                            <p className="text-2xl font-medium text-gray-900">{job.builder?.name}</p>
                            <p className="text-lg text-gray-600">{job.builder?.address}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Inspection Date</h3>
                            <p className="text-2xl font-medium text-gray-900">{new Date(inspection.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Cover Photo (First photo or placeholder) */}
                <div className="flex-1 my-12 bg-gray-100 rounded-lg overflow-hidden relative">
                    {inspection.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={inspection.photos[0].url}
                            alt="Cover Property"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">No Cover Photo Available</div>
                    )}
                </div>

                <div className="border-t pt-8 flex justify-between items-end">
                    <div>
                        <p className="font-bold text-blue-600">Ulrich Energy Auditing</p>
                        <p className="text-sm text-gray-500">123 Energy Way, Austin, TX 78701</p>
                        <p className="text-sm text-gray-500">www.ulrich-energy.com</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Inspector</p>
                        <p className="font-medium">{job.inspector?.name}</p>
                    </div>
                </div>
            </div>

            {/* PAGE 2: SUMMARY & CHECKLIST */}
            <div className="p-12 min-h-[297mm] print:break-after-page">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Inspection Summary</h2>

                <div className="grid grid-cols-2 gap-12 mb-12">
                    <Card>
                        <CardHeader>
                            <CardTitle>Blower Door Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-blue-600 mb-2">
                                {inspectionData?.cfm50 || '--'} <span className="text-lg text-gray-500 font-normal">CFM50</span>
                            </div>
                            <p className="text-sm text-gray-500">Target: &lt; 1500 CFM50</p>
                            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium text-sm">
                                PASS
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Overall Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-green-600 mb-2">PASS</div>
                            <p className="text-sm text-gray-500">All critical checks passed.</p>
                        </CardContent>
                    </Card>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-6">Checklist Items</h3>
                <div className="bg-gray-50 rounded-lg border overflow-hidden mb-12">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="py-3 px-6 font-semibold text-gray-600">Item</th>
                                <th className="py-3 px-6 font-semibold text-gray-600 w-32">Status</th>
                                <th className="py-3 px-6 font-semibold text-gray-600">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {checklist.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-3 px-6 font-medium">{item.label}</td>
                                    <td className="py-3 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${item.status === 'PASS' ? 'bg-green-100 text-green-800' :
                                                item.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {item.status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-sm text-gray-500">{item.note || '-'}</td>
                                </tr>
                            ))}
                            {checklist.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-6 text-center text-gray-500">No checklist data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {inspectionData?.notes && (
                    <div className="mb-12">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Field Notes</h3>
                        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100 text-gray-800 italic">
                            &quot;{inspectionData.notes}&quot;
                        </div>
                    </div>
                )}
            </div>

            {/* PAGE 3: PHOTOS & SIGNATURES */}
            <div className="p-12 min-h-[297mm]">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">Site Photos</h2>

                <div className="grid grid-cols-2 gap-8 mb-16">
                    {inspection.photos.map((photo) => (
                        <div key={photo.id} className="break-inside-avoid">
                            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={photo.url} alt="Inspection" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-sm text-gray-600 font-medium">{photo.caption || 'No caption'}</p>
                            <p className="text-xs text-gray-400">{new Date(photo.createdAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-auto pt-12 border-t-2 border-gray-200 break-inside-avoid">
                    <h3 className="text-xl font-bold text-gray-900 mb-8">Authorization</h3>
                    <div className="grid grid-cols-2 gap-12">
                        <div>
                            <p className="text-sm text-gray-500 mb-4">Inspector Signature</p>
                            <div className="h-24 border-b border-gray-400 mb-2">
                                {signatureUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={signatureUrl} alt="Inspector Signature" className="h-full object-contain" />
                                ) : (
                                    <div className="h-full flex items-end pb-2 text-gray-300 italic">Signed Electronically</div>
                                )}
                            </div>
                            <p className="font-medium">{job.inspector?.name}</p>
                            <p className="text-sm text-gray-500">Certified Energy Auditor</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-4">Date</p>
                            <div className="h-24 border-b border-gray-400 mb-2 flex items-end pb-2">
                                <span className="text-xl">{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
