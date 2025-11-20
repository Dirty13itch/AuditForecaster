'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';

const builders = [
    { id: 1, name: 'M/I Homes', contact: 'Sarah Jenkins', email: 'sjenkins@mihomes.com', activeJobs: 12 },
    { id: 2, name: 'Lennar', contact: 'Mike Ross', email: 'mross@lennar.com', activeJobs: 8 },
    { id: 3, name: 'DR Horton', contact: 'David Kim', email: 'dkim@drhorton.com', activeJobs: 15 },
    { id: 4, name: 'Pulte Group', contact: 'Emily White', email: 'ewhite@pulte.com', activeJobs: 5 },
    { id: 5, name: 'KB Home', contact: 'James Wilson', email: 'jwilson@kbhome.com', activeJobs: 3 },
];

export function BuilderList() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Builders</CardTitle>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Builder
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filter builders..."
                        className="max-w-sm"
                    />
                    <Button variant="ghost" size="icon" className="ml-2">
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <div className="rounded-md border">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Contact</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Active Jobs</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {builders.map((builder) => (
                                <tr key={builder.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle font-medium">{builder.name}</td>
                                    <td className="p-4 align-middle">{builder.contact}</td>
                                    <td className="p-4 align-middle">{builder.email}</td>
                                    <td className="p-4 align-middle text-right">{builder.activeJobs}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
