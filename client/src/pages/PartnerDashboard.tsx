import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, DollarSign } from "lucide-react";

// Stub component for Partner/Contractor Dashboard - to be implemented later
export default function PartnerDashboard() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Partner Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View inspection reports for your projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Upcoming inspections and appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Invoicing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View and manage invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Full partner dashboard implementation coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
