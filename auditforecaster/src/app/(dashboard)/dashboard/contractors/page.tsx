import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Metadata } from "next";
import { SubcontractorDialog } from "@/components/contractors/subcontractor-dialog";
import { SubcontractorActions } from "@/components/contractors/subcontractor-actions";
import { SubcontractorInput } from "@/lib/schemas";

export const metadata: Metadata = {
    title: "Subcontractors | Field Inspect",
    description: "Manage subcontractors and compliance documents.",
};

export default async function ContractorsPage() {
    const subcontractors = await prisma.subcontractor.findMany({
        include: { complianceDocs: true },
        orderBy: { name: 'asc' }
    });

    type ComplianceDoc = {
        id: string
        type: string
        url: string
        expirationDate: Date | null
    }

    // Extend SubcontractorInput with ID and docs for the helper function
    type SubcontractorWithDocs = SubcontractorInput & {
        id: string
        complianceDocs: ComplianceDoc[]
    }

    const getComplianceStatus = (sub: SubcontractorWithDocs) => {
        const hasW9 = sub.complianceDocs.some((d) => d.type === 'W9');
        const hasValidCOI = sub.complianceDocs.some((d) =>
            d.type === 'COI' && (!d.expirationDate || new Date(d.expirationDate) > new Date())
        );

        if (hasW9 && hasValidCOI) return 'COMPLIANT';
        if (!hasW9) return 'MISSING_W9';
        if (!hasValidCOI) return 'MISSING_COI';
        return 'NON_COMPLIANT';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Subcontractors</h2>
                <SubcontractorDialog mode="create" />
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Documents</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subcontractors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                            No subcontractors found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    subcontractors.map((sub) => {
                                        // Cast to compatible type since Prisma return includes extra fields
                                        const compatibleSub = sub as unknown as SubcontractorWithDocs;
                                        const status = getComplianceStatus(compatibleSub);
                                        return (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-medium">{sub.name}</TableCell>
                                                <TableCell>{sub.type}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-sm">
                                                        <span>{sub.email}</span>
                                                        <span className="text-muted-foreground">{sub.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {status === 'COMPLIANT' && <Badge className="bg-green-500">Compliant</Badge>}
                                                    {status === 'MISSING_W9' && <Badge variant="destructive">Missing W9</Badge>}
                                                    {status === 'MISSING_COI' && <Badge variant="destructive">Invalid COI</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {sub.complianceDocs.map((doc: ComplianceDoc) => (
                                                            <Button key={doc.id} variant="ghost" size="icon" title={`${doc.type} - Expires: ${doc.expirationDate?.toLocaleDateString() || 'N/A'}`} asChild>
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                                    <FileText className={`h-4 w-4 ${doc.expirationDate && new Date(doc.expirationDate) < new Date() ? 'text-red-500' : ''}`} />
                                                                </a>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <SubcontractorActions subcontractor={sub as unknown as SubcontractorInput & { id: string }} />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
