import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Payment, InsertPayment, Invoice } from "@shared/schema";
import { insertPaymentSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const { toast } = useToast();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const form = useForm<InsertPayment>({
    resolver: zodResolver(insertPaymentSchema),
    defaultValues: {
      invoiceId: "",
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "direct_deposit",
      referenceNumber: "",
      notes: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertPayment) => {
      return await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPayment) => {
    createPaymentMutation.mutate(data);
  };

  // Get invoice details for display
  const getInvoiceById = (id: string) => {
    return invoices.find(inv => inv.id === id);
  };

  // Sort payments by date descending
  const sortedPayments = [...payments].sort((a, b) => {
    return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
  });

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Record and track payments from Building Knowledge</p>
        </div>

        {/* Payment Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
            <CardDescription>Enter payment details received from Building Knowledge</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice">
                              <SelectValue placeholder="Select invoice" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {invoicesLoading ? (
                              <SelectItem value="loading" disabled>Loading invoices...</SelectItem>
                            ) : invoices.length === 0 ? (
                              <SelectItem value="none" disabled>No invoices available</SelectItem>
                            ) : (
                              invoices.map((invoice) => (
                                <SelectItem 
                                  key={invoice.id} 
                                  value={invoice.id}
                                  data-testid={`select-invoice-option-${invoice.id}`}
                                >
                                  {invoice.invoiceNumber} - ${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-9"
                              data-testid="input-amount"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-payment-date"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="direct_deposit" data-testid="select-method-direct-deposit">Direct Deposit</SelectItem>
                            <SelectItem value="check" data-testid="select-method-check">Check</SelectItem>
                            <SelectItem value="wire" data-testid="select-method-wire">Wire Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Check # or transaction ID"
                            data-testid="input-reference-number"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional payment details..."
                          data-testid="textarea-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={createPaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Payment history from Building Knowledge</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
                Loading payments...
              </div>
            ) : sortedPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-payments">
                No payments recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference #</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPayments.map((payment) => {
                      const invoice = payment.invoiceId ? getInvoiceById(payment.invoiceId) : null;
                      return (
                        <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                          <TableCell data-testid={`cell-payment-date-${payment.id}`}>
                            {format(new Date(payment.paymentDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell data-testid={`cell-invoice-number-${payment.id}`}>
                            {invoice?.invoiceNumber || "N/A"}
                          </TableCell>
                          <TableCell className="font-semibold" data-testid={`cell-amount-${payment.id}`}>
                            ${parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="capitalize" data-testid={`cell-payment-method-${payment.id}`}>
                            {payment.paymentMethod?.replace('_', ' ') || "N/A"}
                          </TableCell>
                          <TableCell data-testid={`cell-reference-number-${payment.id}`}>
                            {payment.referenceNumber || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
