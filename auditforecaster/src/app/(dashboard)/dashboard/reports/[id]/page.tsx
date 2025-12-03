import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Printer, MapPin, Wind, Droplets, Sun } from "lucide-react"
import { notFound } from "next/navigation"
import { DownloadPDFButton } from "@/components/download-pdf-button"
import { TemplateStructure, evaluateLogic, Answer } from "@/lib/reporting/engine"

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const job = await prisma.job.findUnique({
        where: { id },
        include: {
            builder: true,
            inspector: true,
            inspections: {
                include: {
                    photos: true,
                    reportTemplate: true
                },
                orderBy: { createdAt: 'desc' },
                take: 1
            },
        },
    })

    if (!job) notFound()

    const inspection = job.inspections[0]
    if (!inspection) notFound()

    // 1. Load Template & Answers
    const structure = (inspection.reportTemplate?.structure as unknown as TemplateStructure) || { pages: [], logic: [] }
    const answers = (inspection.answers as unknown as Record<string, Answer>) || {}
    const logicState = evaluateLogic(structure, answers)

    // 2. Calculate Stats
    const score = inspection.score || 0
    const maxScore = inspection.maxScore || 100
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

    // Identify Failed Items
    const flaggedItems: { label: string; note: string; page: string }[] = []

    structure.pages.forEach(page => {
        page.sections.forEach(section => {
            section.items.forEach(item => {
                if (!logicState[item.id]?.visible) return
                const ans = answers[item.id]
                if (ans?.notes) {
                    flaggedItems.push({
                        label: item.label,
                        note: ans.notes,
                        page: page.title
                    })
                }
                if (item.type === 'select' && ans?.value === 'Fail') {
                    flaggedItems.push({
                        label: item.label,
                        note: 'Marked as Failed',
                        page: page.title
                    })
                }
            })
        })
    })

    const coverPhoto = inspection.photos[0]?.url

    return (
        <div className="max-w-[210mm] mx-auto bg-white min-h-screen print:p-0 text-slate-900 font-sans">
            {/* Print Controls */}
            <div className="flex justify-end gap-2 p-8 print:hidden bg-slate-50 border-b">
                <DownloadPDFButton jobId={job.id} />
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                </Button>
            </div>

            {/* --- PAGE 1: COVER --- */}
            <div className="h-[297mm] relative flex flex-col print:break-after-page bg-slate-900 text-white">
                {/* Hero Image Background */}
                {coverPhoto && (
                    <div className="absolute inset-0 z-0 opacity-40">

                        <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                    </div>
                )}

                <div className="relative z-10 flex-1 flex flex-col justify-between p-16">
                    {/* Header */}
                    <div className="border-l-4 border-blue-500 pl-6">
                        <h1 className="text-6xl font-bold tracking-tight mb-4">{inspection.reportTemplate?.name || 'Inspection Report'}</h1>
                        <p className="text-2xl text-slate-300 font-light">Compliance & Quality Audit</p>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Property</h3>
                                <p className="text-3xl font-medium">{job.streetAddress}</p>
                                <p className="text-xl text-slate-400">{job.city}, TX</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Client</h3>
                                <p className="text-2xl">{job.builder?.name}</p>
                            </div>
                        </div>
                        <div className="space-y-6 text-right">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Date</h3>
                                <p className="text-2xl">{new Date(inspection.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Inspector</h3>
                                <p className="text-2xl">{job.inspector?.name}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">Score</h3>
                                <div className="text-5xl font-bold text-blue-400">{percentage}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="relative z-10 p-8 bg-slate-950 flex justify-between items-center text-slate-500 text-sm">
                    <span>Ulrich Energy Auditing</span>
                    <span>www.ulrich-energy.com</span>
                </div>
            </div>

            {/* --- PAGE 2: EXECUTIVE SUMMARY --- */}
            <div className="p-12 min-h-[297mm] print:break-after-page bg-white">
                <h2 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b-2 border-slate-100">Executive Summary</h2>

                {/* Context Grid */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-64 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Map View</span>
                        </div>

                        <img
                            src={`https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(job.streetAddress + ' ' + job.city)}&zoom=15&size=600x400&key=YOUR_API_KEY`}
                            alt="Map"
                            className="w-full h-full object-cover opacity-75 mix-blend-multiply"
                        />
                    </div>

                    {/* Weather & Stats */}
                    <div className="grid grid-rows-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex flex-col justify-center">
                            <h3 className="text-blue-900 font-semibold mb-4 flex items-center gap-2">
                                <Sun className="h-5 w-5" /> Weather Conditions
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-400 block text-xs uppercase">Temp</span>
                                    <span className="font-medium text-lg">72°F</span>
                                </div>
                                <div>
                                    <span className="text-blue-400 block text-xs uppercase">Humidity</span>
                                    <span className="font-medium text-lg flex items-center gap-1"><Droplets className="h-3 w-3" /> 45%</span>
                                </div>
                                <div>
                                    <span className="text-blue-400 block text-xs uppercase">Wind</span>
                                    <span className="font-medium text-lg flex items-center gap-1"><Wind className="h-3 w-3" /> 5mph</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-center">
                            <h3 className="text-slate-900 font-semibold mb-2">Inspection Score</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-bold text-slate-900">{percentage}%</span>
                                <span className="text-slate-500 mb-1">/ 100%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                                <div className="bg-blue-600 h-full" style={{ width: `${percentage}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flagged Items */}
                <div className="mb-12">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Action Items & Notes</h3>
                    {flaggedItems.length > 0 ? (
                        <div className="space-y-3">
                            {flaggedItems.map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex-none w-1 bg-red-500 rounded-full" />
                                    <div>
                                        <h4 className="font-semibold text-red-900">{item.label}</h4>
                                        <p className="text-red-700 text-sm mt-1">{item.note}</p>
                                        <span className="text-xs text-red-400 mt-2 block uppercase tracking-wider">{item.page}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-green-50 border border-green-100 rounded-lg text-green-800 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">✓</div>
                            <div>No critical issues or notes found. Great job!</div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- DYNAMIC PAGES --- */}
            {structure.pages.map((page) => (
                <div key={page.id} className="p-12 min-h-[297mm] print:break-after-page bg-white">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b-2 border-slate-100 flex justify-between items-center">
                        {page.title}
                        <span className="text-sm font-normal text-slate-400">Page {structure.pages.indexOf(page) + 1}</span>
                    </h2>

                    <div className="space-y-12">
                        {page.sections.map((section) => (
                            <div key={section.id} className="break-inside-avoid">
                                <h3 className="text-lg font-bold text-slate-700 mb-4 bg-slate-50 p-2 rounded-md border border-slate-100">
                                    {section.title}
                                </h3>

                                <div className="space-y-6">
                                    {section.items.map((item) => {
                                        if (!logicState[item.id]?.visible) return null
                                        const answer = answers[item.id]

                                        return (
                                            <div key={item.id} className="border-b border-slate-100 pb-6 last:border-0">
                                                <div className="flex justify-between items-start gap-8">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900 mb-1">{item.label}</p>
                                                        {answer?.value ? (
                                                            <div className="text-slate-600">
                                                                {String(answer.value)}
                                                            </div>
                                                        ) : null}
                                                        {answer?.notes ? (
                                                            <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 inline-block">
                                                                Note: {answer.notes}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* --- PHOTOS APPENDIX --- */}
            {inspection.photos.length > 0 && (
                <div className="p-12 min-h-[297mm] print:break-after-page bg-white">
                    <h2 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b-2 border-slate-100">Site Photos</h2>
                    <div className="grid grid-cols-2 gap-8">
                        {inspection.photos.map((photo) => (
                            <div key={photo.id} className="break-inside-avoid bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm">
                                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden mb-3 relative">

                                    <img src={photo.url} alt="Evidence" className="w-full h-full object-cover" />
                                </div>
                                <div className="px-2 pb-2">
                                    <p className="font-medium text-slate-900 text-sm">{photo.caption || 'No caption'}</p>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(photo.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- DISCLAIMER --- */}
            <div className="p-12 bg-slate-50 text-slate-400 text-xs text-center border-t border-slate-200 print:break-before-auto">
                <p className="mb-2">© {new Date().getFullYear()} Ulrich Energy Auditing. All rights reserved.</p>
                <p>This report is a snapshot of conditions at the time of inspection. Hidden defects may exist. This report does not constitute a warranty or guarantee of future performance. All data is collected using industry-standard equipment and methodologies.</p>
            </div>
        </div>
    )
}
