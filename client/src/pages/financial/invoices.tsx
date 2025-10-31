import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Download, Mail, Eye } from "lucide-react";
import { format } from "date-fns";
import { InvoiceWizard } from "@/components/financial/invoice-wizard";

type Invoice = {
  id: string;
  invoiceNumber: string;
  builderId: string;
  periodStart: string;
  periodEnd: string;
  subtotal: string;
  tax: string;
  total: string;
  status: "draft" | "reviewed" | "sent" | "paid";
  sentAt?: Date;
  paidAt?: Date;
  createdAt: Date;
};

export default function InvoicesPage() {
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const filteredInvoices = selectedStatus === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === selectedStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "reviewed": return "default";
      case "sent": return "default";
      case "paid": return "default";
      default: return "secondary";
    }
  };

  const handleInvoiceCreated = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    toast({
      title: "Invoice Created",
      description: "Invoice has been created successfully.",
    });
  };

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent successfully via email",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invoice",
        variant: "destructive",
      });
    },
  });

  const handleSendInvoice = (invoiceId: string) => {
    sendInvoiceMutation.mutate(invoiceId);
  };

  if (showWizard) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <InvoiceWizard 
            onClose={() => setShowWizard(false)}
            onComplete={handleInvoiceCreated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Manage monthly invoices to Building Knowledge</p>
          </div>
          <Button onClick={() => setShowWizard(true)} data-testid="button-create-invoice">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
            <TabsTrigger value="reviewed" data-testid="tab-reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">Paid</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-loading">
                Loading invoices...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p data-testid="text-no-invoices">No {selectedStatus !== "all" ? selectedStatus : ""} invoices found</p>
                    {selectedStatus === "all" && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowWizard(true)}
                        data-testid="button-create-first-invoice"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Invoice
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} data-testid={`card-invoice-${invoice.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl" data-testid={`text-invoice-number-${invoice.id}`}>
                            {invoice.invoiceNumber}
                          </CardTitle>
                          <CardDescription data-testid={`text-invoice-period-${invoice.id}`}>
                            Period: {format(new Date(invoice.periodStart), "MMM d, yyyy")} - {format(new Date(invoice.periodEnd), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                        <Badge variant={getStatusColor(invoice.status)} data-testid={`badge-invoice-status-${invoice.id}`}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Total Amount</div>
                          <div className="text-2xl font-bold" data-testid={`text-invoice-total-${invoice.id}`}>
                            ${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid={`button-view-invoice-${invoice.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {invoice.status === "reviewed" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSendInvoice(invoice.id)}
                              data-testid={`button-send-invoice-${invoice.id}`}
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                            data-testid={`button-download-pdf-${invoice.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
