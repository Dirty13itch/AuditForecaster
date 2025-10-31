import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArSnapshot, Invoice, Builder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, differenceInDays } from "date-fns";
import { useLocation } from "wouter";

type BucketType = "current" | "30days" | "60days" | "90plus";

export default function ARAgingReport() {
  const [, setLocation] = useLocation();
  const [selectedBuilder, setSelectedBuilder] = useState<string>("all");

  const { data: arSnapshots = [], isLoading: arLoading } = useQuery<ArSnapshot[]>({
    queryKey: ["/api/ar/aging"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: builders = [], isLoading: buildersLoading } = useQuery<Builder[]>({
    queryKey: ["/api/builders"],
  });

  // Filter AR snapshots by builder if selected
  const filteredSnapshots = selectedBuilder === "all" 
    ? arSnapshots 
    : arSnapshots.filter(snap => snap.builderId === selectedBuilder);

  // Calculate totals across all buckets
  const totals = filteredSnapshots.reduce(
    (acc, snap) => ({
      current: acc.current + parseFloat(snap.current),
      days30: acc.days30 + parseFloat(snap.days30),
      days60: acc.days60 + parseFloat(snap.days60),
      days90Plus: acc.days90Plus + parseFloat(snap.days90Plus),
      totalAR: acc.totalAR + parseFloat(snap.totalAR),
    }),
    { current: 0, days30: 0, days60: 0, days90Plus: 0, totalAR: 0 }
  );

  // Prepare chart data
  const chartData = [
    {
      name: "Current",
      amount: totals.current,
      fill: "hsl(var(--chart-1))",
    },
    {
      name: "30 Days",
      amount: totals.days30,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "60 Days",
      amount: totals.days60,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "90+ Days",
      amount: totals.days90Plus,
      fill: "hsl(var(--chart-4))",
    },
  ];

  // Get builder name by ID
  const getBuilderName = (builderId: string) => {
    const builder = builders.find(b => b.id === builderId);
    return builder?.companyName || "Unknown Builder";
  };

  // Categorize invoices by aging bucket
  const categorizeInvoice = (invoice: Invoice): BucketType => {
    if (invoice.status === "paid") return "current";
    
    const today = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    const daysOverdue = differenceInDays(today, invoiceDate);

    if (daysOverdue <= 30) return "current";
    if (daysOverdue <= 60) return "30days";
    if (daysOverdue <= 90) return "60days";
    return "90plus";
  };

  // Get days overdue
  const getDaysOverdue = (invoice: Invoice): number => {
    if (invoice.status === "paid") return 0;
    const today = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    return Math.max(0, differenceInDays(today, invoiceDate));
  };

  // Filter unpaid invoices and categorize them
  const unpaidInvoices = invoices.filter(inv => inv.status !== "paid");
  const invoicesByBucket = {
    current: unpaidInvoices.filter(inv => categorizeInvoice(inv) === "current"),
    "30days": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "30days"),
    "60days": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "60days"),
    "90plus": unpaidInvoices.filter(inv => categorizeInvoice(inv) === "90plus"),
  };

  const handleInvoiceClick = (invoiceId: string) => {
    setLocation(`/financial/invoices?id=${invoiceId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AR Aging Report</h1>
            <p className="text-muted-foreground">Track outstanding receivables by aging period</p>
          </div>

          {/* Builder Filter */}
          <div className="w-64">
            <Select value={selectedBuilder} onValueChange={setSelectedBuilder}>
              <SelectTrigger data-testid="select-builder-filter">
                <SelectValue placeholder="Filter by builder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="select-builder-all">All Builders</SelectItem>
                {buildersLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  builders.map((builder) => (
                    <SelectItem 
                      key={builder.id} 
                      value={builder.id}
                      data-testid={`select-builder-${builder.id}`}
                    >
                      {builder.companyName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* AR Aging Buckets Display */}
        <Card>
          <CardHeader>
            <CardTitle>Aging Breakdown</CardTitle>
            <CardDescription>Outstanding receivables by aging period</CardDescription>
          </CardHeader>
          <CardContent>
            {arLoading ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-loading">
                Loading AR data...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Total AR Amount */}
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Total Accounts Receivable</div>
                  <div className="text-4xl font-bold" data-testid="text-total-ar">
                    {formatCurrency(totals.totalAR)}
                  </div>
                </div>

                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="amount" name="Amount" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Bucket Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg" data-testid="bucket-current">
                    <div className="text-sm text-muted-foreground mb-1">Current</div>
                    <div className="text-2xl font-bold">{formatCurrency(totals.current)}</div>
                  </div>
                  <div className="p-4 border rounded-lg" data-testid="bucket-30days">
                    <div className="text-sm text-muted-foreground mb-1">30 Days</div>
                    <div className="text-2xl font-bold">{formatCurrency(totals.days30)}</div>
                  </div>
                  <div className="p-4 border rounded-lg" data-testid="bucket-60days">
                    <div className="text-sm text-muted-foreground mb-1">60 Days</div>
                    <div className="text-2xl font-bold">{formatCurrency(totals.days60)}</div>
                  </div>
                  <div className="p-4 border rounded-lg" data-testid="bucket-90plus">
                    <div className="text-sm text-muted-foreground mb-1">90+ Days</div>
                    <div className="text-2xl font-bold">{formatCurrency(totals.days90Plus)}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice List by Bucket */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices by Aging Period</CardTitle>
            <CardDescription>Detailed invoice breakdown by bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="current" data-testid="tab-current">
                  Current ({invoicesByBucket.current.length})
                </TabsTrigger>
                <TabsTrigger value="30days" data-testid="tab-30days">
                  30 Days ({invoicesByBucket["30days"].length})
                </TabsTrigger>
                <TabsTrigger value="60days" data-testid="tab-60days">
                  60 Days ({invoicesByBucket["60days"].length})
                </TabsTrigger>
                <TabsTrigger value="90plus" data-testid="tab-90plus">
                  90+ Days ({invoicesByBucket["90plus"].length})
                </TabsTrigger>
              </TabsList>

              {(["current", "30days", "60days", "90plus"] as BucketType[]).map((bucket) => (
                <TabsContent key={bucket} value={bucket}>
                  {invoicesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading invoices...
                    </div>
                  ) : invoicesByBucket[bucket].length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid={`text-no-invoices-${bucket}`}>
                      No invoices in this bucket
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Builder</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Balance Due</TableHead>
                            <TableHead>Days Overdue</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoicesByBucket[bucket].map((invoice) => {
                            const daysOverdue = getDaysOverdue(invoice);
                            return (
                              <TableRow 
                                key={invoice.id} 
                                className="cursor-pointer hover-elevate"
                                onClick={() => handleInvoiceClick(invoice.id)}
                                data-testid={`row-invoice-${invoice.id}`}
                              >
                                <TableCell className="font-medium" data-testid={`cell-invoice-number-${invoice.id}`}>
                                  {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell data-testid={`cell-builder-${invoice.id}`}>
                                  {getBuilderName(invoice.builderId)}
                                </TableCell>
                                <TableCell data-testid={`cell-invoice-date-${invoice.id}`}>
                                  {format(new Date(invoice.periodEnd), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell data-testid={`cell-amount-${invoice.id}`}>
                                  {formatCurrency(parseFloat(invoice.total))}
                                </TableCell>
                                <TableCell className="font-semibold" data-testid={`cell-balance-${invoice.id}`}>
                                  {formatCurrency(parseFloat(invoice.total))}
                                </TableCell>
                                <TableCell data-testid={`cell-days-overdue-${invoice.id}`}>
                                  {daysOverdue > 0 ? `${daysOverdue} days` : "-"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="default" data-testid={`badge-status-${invoice.id}`}>
                                    {invoice.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
