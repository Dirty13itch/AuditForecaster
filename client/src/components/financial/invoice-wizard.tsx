import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, X, FileText, Send } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Job = {
  id: string;
  type: string;
  address: string;
  completedAt: Date;
  status: string;
};

type LineItem = {
  jobId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  jobType: string;
};

type InvoicePreview = {
  jobs: Job[];
  builderName: string;
  lineItems: LineItem[];
  subtotal: string;
  tax: string;
  total: string;
};

interface InvoiceWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

export function InvoiceWizard({ onClose, onComplete }: InvoiceWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"));
  const [builderId, setBuilderId] = useState("");
  
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);

  const { data: builders = [] } = useQuery<any[]>({
    queryKey: ["/api/builders"],
  });

  const { data: unbilledJobs = [], isLoading: loadingJobs } = useQuery<Job[]>({
    queryKey: ["/api/invoices/unbilled", builderId],
    enabled: !!builderId,
  });

  const previewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/invoices/preview", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: InvoicePreview) => {
      setPreview(data);
      setStep(3);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate invoice preview",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/invoices/create-with-line-items", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      onComplete();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!builderId || !periodStart || !periodEnd) {
        toast({
          title: "Missing Information",
          description: "Please select a builder and date range",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedJobIds.length === 0) {
        toast({
          title: "No Jobs Selected",
          description: "Please select at least one job to invoice",
          variant: "destructive",
        });
        return;
      }
      previewMutation.mutate({
        builderId,
        periodStart,
        periodEnd,
        jobIds: selectedJobIds,
      });
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handleCreateInvoice = () => {
    if (!preview) return;

    const invoiceData = {
      builderId,
      periodStart,
      periodEnd,
      subtotal: preview.subtotal,
      tax: preview.tax,
      total: preview.total,
      status: "draft",
    };

    createMutation.mutate({
      invoice: invoiceData,
      lineItems: preview.lineItems,
    });
  };

  const toggleJob = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const totalSteps = 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Invoice</CardTitle>
            <CardDescription>
              Step {step} of {totalSteps}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-wizard">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded ${
                s < step ? "bg-primary" : s === step ? "bg-primary" : "bg-muted"
              }`}
              data-testid={`progress-step-${s}`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Select Period</h3>
            
            <div className="space-y-2">
              <Label htmlFor="builder">Builder</Label>
              <Select value={builderId} onValueChange={setBuilderId}>
                <SelectTrigger id="builder" data-testid="select-builder">
                  <SelectValue placeholder="Select builder" />
                </SelectTrigger>
                <SelectContent>
                  {builders.map((builder) => (
                    <SelectItem key={builder.id} value={builder.id} data-testid={`option-builder-${builder.id}`}>
                      {builder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Period Start</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  data-testid="input-period-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Period End</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  data-testid="input-period-end"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Select Jobs</h3>
            
            {loadingJobs ? (
              <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
            ) : unbilledJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unbilled jobs found for this period
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {unbilledJobs.map((job) => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={job.id}
                        checked={selectedJobIds.includes(job.id)}
                        onCheckedChange={() => toggleJob(job.id)}
                        data-testid={`checkbox-job-${job.id}`}
                      />
                      <div className="flex-1">
                        <Label htmlFor={job.id} className="font-medium cursor-pointer">
                          {job.address}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          Type: {job.type.toUpperCase()} • Completed: {format(new Date(job.completedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Badge variant="secondary">{job.type}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Selected: {selectedJobIds.length} job{selectedJobIds.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {step === 3 && preview && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Invoice</h3>
            
            <div className="space-y-2 max-h-96 overflow-auto">
              {preview.lineItems.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{item.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} × ${item.unitPrice}
                      </div>
                    </div>
                    <div className="font-semibold">${item.lineTotal}</div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span data-testid="text-subtotal">${preview.subtotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span data-testid="text-tax">${preview.tax}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span data-testid="text-total">${preview.total}</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && preview && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Invoice Preview</h3>
            <Card className="border-2">
              <CardContent className="p-8 space-y-6 bg-card">
                {/* Header */}
                <div className="border-b-2 pb-4" style={{ borderColor: '#c93132' }}>
                  <h2 className="text-3xl font-bold" style={{ color: '#c93132' }}>Ulrich Energy Auditing</h2>
                  <p className="text-sm text-muted-foreground">RESNET-Certified Energy Auditing Services</p>
                </div>

                {/* Invoice Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">INVOICE</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(), 'MMMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Billing Period</p>
                    <p className="font-medium">
                      {format(new Date(periodStart), 'MMM d, yyyy')} - {format(new Date(periodEnd), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Bill To */}
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#c93132' }}>BILL TO</p>
                  <p className="font-medium">{preview.builderName}</p>
                </div>

                {/* Line Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold text-sm">Description</th>
                        <th className="text-right p-3 font-semibold text-sm">Qty</th>
                        <th className="text-right p-3 font-semibold text-sm">Unit Price</th>
                        <th className="text-right p-3 font-semibold text-sm">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.lineItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 text-sm">{item.description}</td>
                          <td className="text-right p-3 text-sm">{item.quantity}</td>
                          <td className="text-right p-3 text-sm">${item.unitPrice}</td>
                          <td className="text-right p-3 text-sm">${item.lineTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${preview.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>${preview.tax}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t-2 font-bold text-lg" style={{ borderColor: '#c93132' }}>
                      <span>Total</span>
                      <span>${preview.total}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground border-t pt-4">
                  <p>Thank you for your business</p>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground text-center">
              This preview shows how your invoice will appear in the PDF
            </p>
          </div>
        )}

        {step === 5 && preview && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Confirm & Create Invoice</h3>
            
            <Card className="p-4 bg-muted/20">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span className="text-2xl font-bold">${preview.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Line Items</span>
                  <span>{preview.lineItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span>{format(new Date(periodStart), "MMM d")} - {format(new Date(periodEnd), "MMM d, yyyy")}</span>
                </div>
              </div>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p>This invoice will be created with status: <strong>Draft</strong></p>
              <p className="mt-2">You can review and send it to the builder from the invoices page.</p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            data-testid="button-previous"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <Button
            onClick={step === 5 ? handleCreateInvoice : handleNext}
            disabled={previewMutation.isPending || createMutation.isPending}
            data-testid="button-next"
          >
            {step === 5 ? (
              <>
                {createMutation.isPending ? "Creating..." : "Create Invoice"}
                <Send className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
