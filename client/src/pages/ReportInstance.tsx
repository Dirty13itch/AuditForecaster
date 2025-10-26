import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Mail, FileText, Calendar, User, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { InspectionScore } from "@/components/InspectionScore";
import { getComplianceBadgeVariant, getComplianceBadgeClassName, getComplianceBadgeText } from "@/lib/compliance";
import type { ReportInstance, Job, Builder, ChecklistItem } from "@shared/schema";
import { clientLogger } from "@/lib/logger";

interface ReportInstanceWithDetails extends ReportInstance {
  job?: Job;
  builder?: Builder;
  checklistItems?: ChecklistItem[];
}

export default function ReportInstancePage() {
  const { id } = useParams() as { id: string };

  const { data: reportInstance, isLoading } = useQuery<ReportInstanceWithDetails>({
    queryKey: ["/api/report-instances", id],
    enabled: !!id,
  });

  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist-items"],
    queryFn: async () => {
      if (!reportInstance?.jobId) return [];
      const response = await fetch(`/api/checklist-items?jobId=${reportInstance.jobId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!reportInstance?.jobId,
  });

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/reports/${id}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      clientLogger.error('Failed to download PDF:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!reportInstance) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Report Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The report you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => window.history.back()} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportData = reportInstance.data ? JSON.parse(reportInstance.data) : {};
  const status = reportInstance.emailedTo ? "Sent" : reportInstance.pdfUrl ? "Finalized" : "Draft";

  // Parse compliance flags safely
  let complianceData: { violations?: Array<{ metric: string; threshold: number; actualValue: number; severity: string }>; evaluatedAt?: string } | null = null;
  if (reportInstance.complianceFlags) {
    try {
      complianceData = typeof reportInstance.complianceFlags === 'string' 
        ? JSON.parse(reportInstance.complianceFlags) 
        : reportInstance.complianceFlags;
    } catch (e) {
      clientLogger.error('Failed to parse compliance flags:', e);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Inspection Report</h1>
            <p className="text-sm text-muted-foreground">
              {reportInstance.job?.name || 'Report Details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'Sent' ? 'default' : status === 'Finalized' ? 'secondary' : 'outline'} data-testid="badge-status">
            {status}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadPDF}
            data-testid="button-download"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" data-testid="button-email">
            <Mail className="w-4 h-4 mr-2" />
            Email Report
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {checklistItems.length > 0 && (
          <InspectionScore items={checklistItems} />
        )}

        <Card data-testid="card-compliance">
          <CardHeader>
            <CardTitle>Minnesota Code Compliance</CardTitle>
            <CardDescription>2020 Minnesota Energy Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge 
                variant={getComplianceBadgeVariant(reportInstance.complianceStatus)}
                className={getComplianceBadgeClassName(reportInstance.complianceStatus)}
                data-testid="badge-compliance-status"
              >
                {getComplianceBadgeText(reportInstance.complianceStatus)}
              </Badge>
            </div>

            {complianceData?.evaluatedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Evaluated</span>
                <span className="text-sm font-medium" data-testid="text-evaluation-date">
                  {format(new Date(complianceData.evaluatedAt), 'PPP')}
                </span>
              </div>
            )}

            {reportInstance.complianceStatus === "non-compliant" && complianceData?.violations && complianceData.violations.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-2">Code Violations</h4>
                  <div className="space-y-3" data-testid="list-violations">
                    {complianceData.violations.map((violation, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-2 p-3 rounded-md bg-destructive/10"
                        data-testid={`violation-${index}`}
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
                        <div className="flex-1 text-sm">
                          <div className="font-medium text-destructive" data-testid={`violation-metric-${index}`}>
                            {violation.metric}
                          </div>
                          <div className="text-muted-foreground mt-1">
                            <span>Threshold: {violation.threshold}</span>
                            <span className="mx-2">•</span>
                            <span data-testid={`violation-actual-${index}`}>Actual: {violation.actualValue}</span>
                          </div>
                          {violation.severity && (
                            <Badge 
                              variant={violation.severity === 'critical' ? 'destructive' : 'secondary'}
                              className="mt-2"
                              data-testid={`violation-severity-${index}`}
                            >
                              {violation.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {reportInstance.complianceStatus === "pending" && (
              <div className="text-sm text-muted-foreground" data-testid="text-pending-message">
                Awaiting actual test results to complete compliance evaluation.
              </div>
            )}

            <div className="space-y-2">
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Minnesota Code Requirements</h4>
                <div className="text-xs text-muted-foreground space-y-1" data-testid="text-code-requirements">
                  <div>• Total Duct Leakage (TDL): ≤ 4.0 CFM/100 sq ft</div>
                  <div>• Duct Leakage to Outside (DLO): ≤ 6.0 CFM/100 sq ft</div>
                  <div>• Air Changes per Hour (ACH50): ≤ 5.0 ACH</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-report-info">
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportInstance.createdAt && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Created Date</div>
                  <div className="font-medium" data-testid="text-created-date">
                    {format(new Date(reportInstance.createdAt), 'PPP')}
                  </div>
                </div>
              </div>
            )}

            {reportData.inspector && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Inspector</div>
                  <div className="font-medium" data-testid="text-inspector">
                    {reportData.inspector}
                  </div>
                </div>
              </div>
            )}

            {reportInstance.emailedTo && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">Emailed To</div>
                  <div className="font-medium" data-testid="text-emailed-to">
                    {reportInstance.emailedTo}
                  </div>
                  {reportInstance.emailedAt && (
                    <div className="text-sm text-muted-foreground">
                      on {format(new Date(reportInstance.emailedAt), 'PPP')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {reportInstance.job && (
        <Card data-testid="card-job-details">
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Job Name</div>
                <div className="font-medium" data-testid="text-job-name">
                  {reportInstance.job.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-medium" data-testid="text-job-address">
                  {reportInstance.job.address}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Contractor</div>
                <div className="font-medium" data-testid="text-contractor">
                  {reportInstance.job.contractor}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Inspection Type</div>
                <div className="font-medium" data-testid="text-inspection-type">
                  {reportInstance.job.inspectionType}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.overview && (
        <Card data-testid="card-overview">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed" data-testid="text-overview">
              {reportData.overview}
            </p>
          </CardContent>
        </Card>
      )}

      {reportData.forecast && (
        <Card data-testid="card-forecast">
          <CardHeader>
            <CardTitle>Duct Leakage Forecast</CardTitle>
            <CardDescription>Predicted vs Actual Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {reportData.forecast.predictedTDL && (
                <div>
                  <div className="text-xs text-muted-foreground">Predicted TDL</div>
                  <div className="text-2xl font-bold" data-testid="text-predicted-tdl">
                    {reportData.forecast.predictedTDL}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.predictedDLO && (
                <div>
                  <div className="text-xs text-muted-foreground">Predicted DLO</div>
                  <div className="text-2xl font-bold" data-testid="text-predicted-dlo">
                    {reportData.forecast.predictedDLO}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.actualTDL && (
                <div>
                  <div className="text-xs text-muted-foreground">Actual TDL</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-actual-tdl">
                    {reportData.forecast.actualTDL}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
              {reportData.forecast.actualDLO && (
                <div>
                  <div className="text-xs text-muted-foreground">Actual DLO</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-actual-dlo">
                    {reportData.forecast.actualDLO}
                  </div>
                  <div className="text-xs text-muted-foreground">CFM25</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.finalNotes && (
        <Card data-testid="card-final-notes">
          <CardHeader>
            <CardTitle>Final Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-final-notes">
              {reportData.finalNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
