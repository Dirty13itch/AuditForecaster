import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calculator,
  FileSearch,
  ClipboardCheck,
  Package,
  Home,
  Wind,
  Droplets,
  ThermometerSun,
  Zap,
  FileText,
  Download,
  RefreshCw,
  ChevronRight,
  Building2,
  TrendingUp,
  Shield,
  Activity
} from "lucide-react";
import type { 
  TaxCreditProject,
  TaxCreditRequirement,
  UnitCertification,
  BlowerDoorTest,
  DuctLeakageTest
} from "@shared/schema";

interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "pending";
  details: string;
  category: string;
  icon: any;
}

interface EnergyModel {
  referenceHome: {
    heatingLoad: number;
    coolingLoad: number;
    annualEnergy: number;
    hersIndex: number;
  };
  asBuiltHome: {
    heatingLoad: number;
    coolingLoad: number;
    annualEnergy: number;
    hersIndex: number;
  };
  percentSavings: number;
  qualified: boolean;
}

export default function TaxCreditCompliance() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("verification");
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch all projects for dropdown
  const { data: projectsData } = useQuery<{ data: TaxCreditProject[] }>({
    queryKey: ["/api/tax-credit-projects", { limit: 100 }],
  });

  const projects = projectsData?.data || [];

  // Fetch selected project details
  const { data: project } = useQuery<TaxCreditProject>({
    queryKey: [`/api/tax-credit-projects/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  // Fetch requirements for selected project
  const { data: requirements = [] } = useQuery<TaxCreditRequirement[]>({
    queryKey: [`/api/tax-credit-requirements/project/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  // Fetch unit certifications
  const { data: certifications = [] } = useQuery<UnitCertification[]>({
    queryKey: [`/api/unit-certifications/project/${selectedProjectId}`],
    enabled: !!selectedProjectId,
  });

  // Mock energy model data (would be calculated from actual test data)
  const energyModel: EnergyModel = {
    referenceHome: {
      heatingLoad: 45000,
      coolingLoad: 36000,
      annualEnergy: 120000,
      hersIndex: 100,
    },
    asBuiltHome: {
      heatingLoad: 22500,
      coolingLoad: 18000,
      annualEnergy: 58800,
      hersIndex: 49,
    },
    percentSavings: 51,
    qualified: true,
  };

  // Perform compliance checks
  const complianceChecks: ComplianceCheck[] = [
    {
      id: "hers-index",
      name: "HERS Index Verification",
      description: "HERS Index must be ≤ 55",
      status: energyModel.asBuiltHome.hersIndex <= 55 ? "pass" : "fail",
      details: `HERS Index: ${energyModel.asBuiltHome.hersIndex}`,
      category: "Energy Performance",
      icon: ThermometerSun,
    },
    {
      id: "energy-savings",
      name: "Energy Savings",
      description: "Must achieve ≥ 50% energy savings",
      status: energyModel.percentSavings >= 50 ? "pass" : "fail",
      details: `Savings: ${energyModel.percentSavings}%`,
      category: "Energy Performance",
      icon: TrendingUp,
    },
    {
      id: "blower-door",
      name: "Air Tightness Testing",
      description: "All units must have blower door test results",
      status: certifications.length > 0 && certifications.every(c => c.blowerDoorACH50 !== null) ? "pass" : "warning",
      details: `${certifications.filter(c => c.blowerDoorACH50 !== null).length}/${certifications.length} units tested`,
      category: "Testing",
      icon: Wind,
    },
    {
      id: "duct-leakage",
      name: "Duct Leakage Testing",
      description: "All units must have duct leakage test results",
      status: certifications.length > 0 && certifications.every(c => c.ductLeakageCFM25 !== null) ? "pass" : "warning",
      details: `${certifications.filter(c => c.ductLeakageCFM25 !== null).length}/${certifications.length} units tested`,
      category: "Testing",
      icon: Droplets,
    },
    {
      id: "hvac-sizing",
      name: "HVAC Sizing",
      description: "HVAC systems must be properly sized",
      status: "pass",
      details: "Manual J calculations verified",
      category: "Equipment",
      icon: ThermometerSun,
    },
    {
      id: "insulation",
      name: "Insulation Grade",
      description: "Insulation must meet Grade I or II standards",
      status: "pass",
      details: "Grade I installation verified",
      category: "Building Envelope",
      icon: Package,
    },
    {
      id: "windows",
      name: "Window Specifications",
      description: "Windows must meet U-factor and SHGC requirements",
      status: "pass",
      details: "U-factor ≤ 0.30, SHGC ≤ 0.25",
      category: "Building Envelope",
      icon: Home,
    },
    {
      id: "equipment-ahri",
      name: "Equipment Certification",
      description: "All equipment must have AHRI certificates",
      status: requirements.find(r => r.requirementType === "equipment-ahri")?.status === "completed" ? "pass" : "warning",
      details: "AHRI certificates on file",
      category: "Equipment",
      icon: Zap,
    },
    {
      id: "documentation",
      name: "Documentation Complete",
      description: "All required documents must be uploaded",
      status: requirements.filter(r => r.status === "completed").length === requirements.length ? "pass" : "warning",
      details: `${requirements.filter(r => r.status === "completed").length}/${requirements.length} requirements met`,
      category: "Documentation",
      icon: FileText,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "bg-green-500";
      case "fail":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const passedChecks = complianceChecks.filter(c => c.status === "pass").length;
  const failedChecks = complianceChecks.filter(c => c.status === "fail").length;
  const warningChecks = complianceChecks.filter(c => c.status === "warning").length;
  const complianceScore = Math.round((passedChecks / complianceChecks.length) * 100);

  const handleVerify = () => {
    setIsVerifying(true);
    // Simulate verification process
    setTimeout(() => {
      setIsVerifying(false);
    }, 2000);
  };

  const canCertify = failedChecks === 0 && warningChecks === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">45L Compliance Verification</h1>
          <p className="text-muted-foreground mt-1">
            Automated compliance checking and certification workflow
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleVerify}
            disabled={!selectedProjectId || isVerifying}
            data-testid="button-run-verification"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? "Verifying..." : "Run Verification"}
          </Button>
        </div>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>Choose a project to verify 45L tax credit compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project" data-testid="select-project">
                  <SelectValue placeholder="Select a project to verify" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.projectName} - Tax Year {project.taxYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {project && (
              <div className="flex gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Units</Label>
                  <p className="text-lg font-medium">{project.totalUnits}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Qualified</Label>
                  <p className="text-lg font-medium">{project.qualifiedUnits || 0}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={project.status === "certified" ? "bg-green-500" : "bg-yellow-500"}>
                    {project.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <>
          {/* Compliance Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-compliance-score">{complianceScore}%</div>
                <Progress value={complianceScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Passed Checks</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-passed-checks">{passedChecks}</div>
                <p className="text-xs text-muted-foreground">
                  of {complianceChecks.length} total checks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-warnings">{warningChecks}</div>
                <p className="text-xs text-muted-foreground">
                  Items need attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Checks</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-failed-checks">{failedChecks}</div>
                <p className="text-xs text-muted-foreground">
                  Must be resolved
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="verification" data-testid="tab-verification">Verification Results</TabsTrigger>
              <TabsTrigger value="energy-model" data-testid="tab-energy">Energy Model</TabsTrigger>
              <TabsTrigger value="certification" data-testid="tab-certification">Certification</TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Checklist</CardTitle>
                  <CardDescription>
                    Automated verification of all 45L requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    complianceChecks.reduce((acc, check) => {
                      if (!acc[check.category]) acc[check.category] = [];
                      acc[check.category].push(check);
                      return acc;
                    }, {} as Record<string, ComplianceCheck[]>)
                  ).map(([category, checks]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground">{category}</h3>
                      <div className="space-y-2">
                        {checks.map((check) => {
                          const Icon = check.icon;
                          return (
                            <div
                              key={check.id}
                              className="flex items-start gap-3 p-4 border rounded-lg"
                              data-testid={`check-${check.id}`}
                            >
                              <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{check.name}</span>
                                  <Badge variant="outline" className={getStatusColor(check.status)}>
                                    {check.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{check.description}</p>
                                <p className="text-sm mt-1">{check.details}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="energy-model" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Energy Model Comparison</CardTitle>
                  <CardDescription>
                    Reference home vs. as-built home energy performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Reference Home */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Reference Home (Baseline)
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Heating Load</Label>
                          <p className="text-lg font-medium">{energyModel.referenceHome.heatingLoad.toLocaleString()} BTU</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Cooling Load</Label>
                          <p className="text-lg font-medium">{energyModel.referenceHome.coolingLoad.toLocaleString()} BTU</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Annual Energy Use</Label>
                          <p className="text-lg font-medium">{energyModel.referenceHome.annualEnergy.toLocaleString()} kWh</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">HERS Index</Label>
                          <p className="text-lg font-medium">{energyModel.referenceHome.hersIndex}</p>
                        </div>
                      </div>
                    </div>

                    {/* As-Built Home */}
                    <div className="space-y-4">
                      <h3 className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        As-Built Home
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Heating Load</Label>
                          <p className="text-lg font-medium">{energyModel.asBuiltHome.heatingLoad.toLocaleString()} BTU</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Cooling Load</Label>
                          <p className="text-lg font-medium">{energyModel.asBuiltHome.coolingLoad.toLocaleString()} BTU</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Annual Energy Use</Label>
                          <p className="text-lg font-medium">{energyModel.asBuiltHome.annualEnergy.toLocaleString()} kWh</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">HERS Index</Label>
                          <p className="text-lg font-medium">{energyModel.asBuiltHome.hersIndex}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm text-muted-foreground">Energy Savings</Label>
                        <p className="text-2xl font-bold text-green-600" data-testid="text-energy-savings">
                          {energyModel.percentSavings}%
                        </p>
                      </div>
                      <div className="text-right">
                        <Label className="text-sm text-muted-foreground">Qualification Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {energyModel.qualified ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-green-600">Qualified</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-600" />
                              <span className="font-medium text-red-600">Not Qualified</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>Calculation Method</AlertTitle>
                <AlertDescription>
                  Energy savings are calculated using approved software (REM/Rate, EnergyGauge) comparing the as-built home
                  to a reference home meeting 2006 IECC standards. A minimum of 50% savings is required for 45L qualification.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="certification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Certification Package</CardTitle>
                  <CardDescription>
                    Generate and download 45L tax credit certification documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {canCertify ? (
                    <>
                      <Alert className="border-green-600">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle>Ready for Certification</AlertTitle>
                        <AlertDescription>
                          This project meets all requirements for 45L tax credit certification.
                          You can generate the certification package below.
                        </AlertDescription>
                      </Alert>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Button className="h-auto py-4" data-testid="button-generate-letter">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <span>Generate Certification Letter</span>
                          </div>
                        </Button>
                        
                        <Button className="h-auto py-4" data-testid="button-irs-form">
                          <div className="flex flex-col items-center gap-2">
                            <Download className="h-5 w-5" />
                            <span>Export IRS Form 8908 Data</span>
                          </div>
                        </Button>
                      </div>

                      <div className="space-y-2 mt-4">
                        <h4 className="font-medium">Certification Package Contents:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Energy consultant certification letter
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Software compliance report
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Individual unit test results
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Equipment specifications and AHRI certificates
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Building plans and specifications
                          </li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <>
                      <Alert className="border-red-600">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle>Cannot Certify</AlertTitle>
                        <AlertDescription>
                          This project has {failedChecks} failed checks and {warningChecks} warnings that must be resolved
                          before certification can be generated.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <h4 className="font-medium">Required Actions:</h4>
                        <ul className="space-y-1 text-sm">
                          {complianceChecks
                            .filter(c => c.status === "fail" || c.status === "warning")
                            .map(check => (
                              <li key={check.id} className="flex items-start gap-2">
                                {check.status === "fail" ? (
                                  <XCircle className="h-3 w-3 text-red-600 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-yellow-600 mt-0.5" />
                                )}
                                <div>
                                  <span className="font-medium">{check.name}:</span> {check.details}
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {canCertify && (
                <Card>
                  <CardHeader>
                    <CardTitle>Archive Certification</CardTitle>
                    <CardDescription>
                      Save this certification for future reference and audit purposes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notes">Certification Notes</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any additional notes or observations..."
                          className="mt-1"
                          data-testid="input-certification-notes"
                        />
                      </div>
                      <Button className="w-full" data-testid="button-archive">
                        <FileSearch className="mr-2 h-4 w-4" />
                        Archive and Complete Certification
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}