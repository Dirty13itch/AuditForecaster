import { CalendarImportQueue } from "@/components/CalendarImportQueue";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CalendarImportQueuePage() {
  const { user } = useAuth();
  
  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CalendarImportQueue />
    </div>
  );
}