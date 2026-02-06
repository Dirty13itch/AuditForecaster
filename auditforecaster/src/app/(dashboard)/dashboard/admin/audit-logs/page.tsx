import { Metadata } from "next";
import { AuditLogViewer } from "@/components/audit-log-viewer";

export const metadata: Metadata = {
    title: "Audit Logs | Field Inspect",
    description: "View and filter the audit trail of all system changes.",
};

export default function AuditLogsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
                <p className="text-gray-500 mt-1">
                    Browse the complete audit trail of changes made across the system.
                    Filter by entity type, action, or date range to find specific events.
                </p>
            </div>

            <AuditLogViewer />
        </div>
    );
}
