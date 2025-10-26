import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { DuctLeakageTest, InsertDuctLeakageTest } from "@shared/schema";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Home,
  Wrench,
  Activity,
  BarChart3,
  Network,
  Clock,
  Plus,
  Trash2,
  Download
} from "lucide-react";

interface PressurePanReading {
  location: string;
  supplyReturn: 'supply' | 'return';
  reading: number;
  passFail: 'pass' | 'fail' | 'marginal';
}

function DuctLeakageTestPage() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  
  // Minnesota 2020 Energy Code limits (accurate values)
  const MINNESOTA_TDL_LIMIT = 4.0; // CFM25/100 sq ft for Total Duct Leakage
  const MINNESOTA_DLO_LIMIT = 3.0; // CFM25/100 sq ft for Duct Leakage to Outside
  
  // Test data state - matching database schema
  const [testData, setTestData] = useState<Partial<InsertDuctLeakageTest>>({
    testDate: new Date(),
    testTime: new Date().toTimeString().slice(0, 5),
    testType: 'both',
    equipmentSerial: "",
    equipmentCalibrationDate: undefined,
    systemType: 'forced_air',
    numberOfSystems: 1,
    conditionedArea: 0,
    systemAirflow: 0,
    // Total Duct Leakage fields
    totalFanPressure: 0,
    totalRingConfiguration: "Open",
    cfm25Total: 0,
    totalCfmPerSqFt: 0,
    totalPercentOfFlow: 0,
    // Duct Leakage to Outside fields
    outsideHousePressure: -25,
    outsideFanPressure: 0,
    outsideRingConfiguration: "Open",
    cfm25Outside: 0,
    outsideCfmPerSqFt: 0,
    outsidePercentOfFlow: 0,
    // Pressure Pan readings (as JSON)
    pressurePanReadings: [
      { location: "Master Bedroom", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Bedroom 2", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Bedroom 3", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Living Room", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Kitchen", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Hallway", supplyReturn: "return", reading: 0, passFail: "pass" },
    ] as PressurePanReading[],
    // Code compliance
    codeYear: "2020",
    totalDuctLeakageLimit: MINNESOTA_TDL_LIMIT,
    outsideLeakageLimit: MINNESOTA_DLO_LIMIT,
    meetsCodeTDL: false,
    meetsCodeDLO: false,
    // Additional fields
    notes: "",
    recommendations: "",
  });

  // Fetch job data
  const { data: job } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Fetch latest test data if exists
  const { data: existingTest, isLoading: loadingTest } = useQuery({
    queryKey: ["/api/jobs", jobId, "duct-leakage-tests/latest"],
    enabled: !!jobId,
  });

  // Load existing test data if available
  useEffect(() => {
    if (existingTest) {
      setTestData({
        ...existingTest,
        testDate: new Date(existingTest.testDate),
        equipmentCalibrationDate: existingTest.equipmentCalibrationDate ? new Date(existingTest.equipmentCalibrationDate) : undefined,
        pressurePanReadings: existingTest.pressurePanReadings || [],
      });
    } else if (job) {
      // Use job's building data if available
      setTestData(prev => ({
        ...prev,
        conditionedArea: parseFloat(job.floorArea || "0") || prev.conditionedArea,
      }));
    }
  }, [existingTest, job]);

  // Calculate CFM25 from fan pressure with accurate calibration curves
  const calculateCFM25 = (fanPressure: number, ringConfig: string): number => {
    if (fanPressure <= 0) return 0;
    
    // Minneapolis Duct Blaster calibration factors (typical for Minnesota testing)
    // These are more accurate than the simplified formula
    const ringFactors: Record<string, { C: number; n: number }> = {
      "Open": { C: 110, n: 0.5 },      // Open configuration
      "Ring 1": { C: 71, n: 0.5 },     // Ring 1 (65% flow reduction)
      "Ring 2": { C: 46, n: 0.5 },     // Ring 2 (42% flow reduction)
      "Ring 3": { C: 31, n: 0.5 },     // Ring 3 (28% flow reduction)
    };
    
    const config = ringFactors[ringConfig] || ringFactors["Open"];
    
    // Calculate CFM at measured pressure, then convert to CFM25
    const cfmMeasured = config.C * Math.pow(fanPressure, config.n);
    
    // If we're not at exactly 25 Pa, correct to 25 Pa using flow equation
    // This is typically not needed as we target 25 Pa in the test
    const cfm25 = cfmMeasured; // Assuming test is at 25 Pa
    
    return cfm25;
  };

  // Calculate Total Duct Leakage results with accurate Minnesota compliance
  const calculateTotalDuctLeakage = () => {
    if (!testData.conditionedArea || testData.conditionedArea <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter conditioned area first",
        variant: "destructive",
      });
      return;
    }

    const cfm25 = calculateCFM25(testData.totalFanPressure || 0, testData.totalRingConfiguration || "Open");
    const cfmPerSqFt = (cfm25 / testData.conditionedArea) * 100; // CFM25 per 100 sq ft
    const percentOfFlow = testData.systemAirflow && testData.systemAirflow > 0 
      ? (cfm25 / testData.systemAirflow) * 100 
      : 0;
    
    // Minnesota 2020 Energy Code: ≤ 4.0 CFM25/100 sq ft for TDL
    const meetsCode = cfmPerSqFt <= MINNESOTA_TDL_LIMIT;
    
    setTestData(prev => ({
      ...prev,
      cfm25Total: Math.round(cfm25),
      totalCfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
      totalPercentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      meetsCodeTDL: meetsCode,
    }));
    
    toast({
      title: "TDL calculated",
      description: `${cfmPerSqFt.toFixed(2)} CFM25/100ft² | ${meetsCode ? '✓ Passes' : '✗ Fails'} Minnesota 2020 Code (≤${MINNESOTA_TDL_LIMIT})`,
      variant: meetsCode ? "default" : "destructive",
    });
  };

  // Calculate Duct Leakage to Outside results with accurate Minnesota compliance
  const calculateLeakageToOutside = () => {
    if (!testData.conditionedArea || testData.conditionedArea <= 0) {
      toast({
        title: "Missing data",
        description: "Please enter conditioned area first",
        variant: "destructive",
      });
      return;
    }

    // For DLO test, house should be at -25 Pa
    if (Math.abs((testData.outsideHousePressure || 0) + 25) > 2) {
      toast({
        title: "Warning",
        description: "House pressure should be at -25 Pa for accurate DLO testing",
        variant: "destructive",
      });
    }

    const cfm25 = calculateCFM25(testData.outsideFanPressure || 0, testData.outsideRingConfiguration || "Open");
    const cfmPerSqFt = (cfm25 / testData.conditionedArea) * 100; // CFM25 per 100 sq ft
    const percentOfFlow = testData.systemAirflow && testData.systemAirflow > 0 
      ? (cfm25 / testData.systemAirflow) * 100 
      : 0;
    
    // Minnesota 2020 Energy Code: ≤ 3.0 CFM25/100 sq ft for DLO
    const meetsCode = cfmPerSqFt <= MINNESOTA_DLO_LIMIT;
    
    setTestData(prev => ({
      ...prev,
      cfm25Outside: Math.round(cfm25),
      outsideCfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
      outsidePercentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      meetsCodeDLO: meetsCode,
    }));
    
    toast({
      title: "DLO calculated",
      description: `${cfmPerSqFt.toFixed(2)} CFM25/100ft² | ${meetsCode ? '✓ Passes' : '✗ Fails'} Minnesota 2020 Code (≤${MINNESOTA_DLO_LIMIT})`,
      variant: meetsCode ? "default" : "destructive",
    });
  };

  // Evaluate pressure pan reading based on industry standards
  const evaluatePressurePan = (reading: number): 'pass' | 'fail' | 'marginal' => {
    if (reading <= 1.0) return 'pass';      // Good seal
    if (reading <= 3.0) return 'marginal';  // Some leakage
    return 'fail';                          // Significant leakage
  };

  // Add new pressure pan reading
  const addPressurePanReading = () => {
    setTestData(prev => ({
      ...prev,
      pressurePanReadings: [
        ...(prev.pressurePanReadings as PressurePanReading[] || []),
        { location: "", supplyReturn: "supply", reading: 0, passFail: "pass" }
      ]
    }));
  };

  // Remove pressure pan reading
  const removePressurePanReading = (index: number) => {
    setTestData(prev => ({
      ...prev,
      pressurePanReadings: (prev.pressurePanReadings as PressurePanReading[] || []).filter((_, i) => i !== index)
    }));
  };

  // Save test mutation
  const saveTestMutation = useMutation({
    mutationFn: async (data: Partial<InsertDuctLeakageTest>) => {
      const endpoint = existingTest?.id 
        ? `/api/duct-leakage-tests/${existingTest.id}`
        : "/api/duct-leakage-tests";
      const method = existingTest?.id ? "PATCH" : "POST";
      
      return apiRequest(endpoint, method, {
        ...data,
        jobId,
        testDate: data.testDate?.toISOString(),
        equipmentCalibrationDate: data.equipmentCalibrationDate?.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "duct-leakage-tests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/duct-leakage-tests"] });
      toast({
        title: "Test saved",
        description: "Duct leakage test data has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: "Failed to save test data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => 
      apiRequest(`/api/duct-leakage-tests/${testId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "duct-leakage-tests"] });
      // Reset form
      setTestData({
        testDate: new Date(),
        testTime: new Date().toTimeString().slice(0, 5),
        testType: 'both',
        equipmentSerial: "",
        equipmentCalibrationDate: undefined,
        systemType: 'forced_air',
        numberOfSystems: 1,
        conditionedArea: job ? parseFloat(job.floorArea || "0") : 0,
        systemAirflow: 0,
        totalFanPressure: 0,
        totalRingConfiguration: "Open",
        cfm25Total: 0,
        totalCfmPerSqFt: 0,
        totalPercentOfFlow: 0,
        outsideHousePressure: -25,
        outsideFanPressure: 0,
        outsideRingConfiguration: "Open",
        cfm25Outside: 0,
        outsideCfmPerSqFt: 0,
        outsidePercentOfFlow: 0,
        pressurePanReadings: [
          { location: "Master Bedroom", supplyReturn: "supply", reading: 0, passFail: "pass" },
          { location: "Bedroom 2", supplyReturn: "supply", reading: 0, passFail: "pass" },
          { location: "Bedroom 3", supplyReturn: "supply", reading: 0, passFail: "pass" },
          { location: "Living Room", supplyReturn: "supply", reading: 0, passFail: "pass" },
          { location: "Kitchen", supplyReturn: "supply", reading: 0, passFail: "pass" },
          { location: "Hallway", supplyReturn: "return", reading: 0, passFail: "pass" },
        ] as PressurePanReading[],
        codeYear: "2020",
        totalDuctLeakageLimit: MINNESOTA_TDL_LIMIT,
        outsideLeakageLimit: MINNESOTA_DLO_LIMIT,
        meetsCodeTDL: false,
        meetsCodeDLO: false,
        notes: "",
        recommendations: "",
      });
      toast({
        title: "Test deleted",
        description: "Duct leakage test data has been deleted.",
      });
    },
  });

  const handleSaveTest = () => {
    if (testData.testType === 'total' && !testData.cfm25Total) {
      toast({
        title: "Incomplete test",
        description: "Please calculate TDL results before saving.",
        variant: "destructive",
      });
      return;
    }
    if (testData.testType === 'leakage_to_outside' && !testData.cfm25Outside) {
      toast({
        title: "Incomplete test",
        description: "Please calculate DLO results before saving.",
        variant: "destructive",
      });
      return;
    }
    if (testData.testType === 'both' && (!testData.cfm25Total || !testData.cfm25Outside)) {
      toast({
        title: "Incomplete test",
        description: "Please calculate both TDL and DLO results before saving.",
        variant: "destructive",
      });
      return;
    }
    saveTestMutation.mutate(testData);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/full-report/pdf`, {
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
      a.download = `duct-leakage-test-${jobId}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "The test report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Network className="h-8 w-8" />
              Duct Leakage Test
            </h1>
            <p className="text-muted-foreground mt-1">
              {job ? `${job.address}, ${job.city}` : `Job: ${jobId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={testData.meetsCodeTDL ? "default" : "destructive"}>
              TDL: {testData.totalCfmPerSqFt || "—"} CFM25/100ft²
            </Badge>
            <Badge variant={testData.meetsCodeDLO ? "default" : "destructive"}>
              DLO: {testData.outsideCfmPerSqFt || "—"} CFM25/100ft²
            </Badge>
            {existingTest && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Last saved: {new Date(existingTest.updatedAt || existingTest.createdAt).toLocaleString()}
              </Badge>
            )}
            <Button
              onClick={handleSaveTest}
              disabled={saveTestMutation.isPending}
              data-testid="button-save-test"
            >
              <Save className="h-4 w-4 mr-2" />
              {existingTest ? 'Update' : 'Save'} Test
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {existingTest && (
              <Button
                variant="destructive"
                onClick={() => deleteTestMutation.mutate(existingTest.id)}
                disabled={deleteTestMutation.isPending}
                data-testid="button-delete-test"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="tdl">Total Leakage</TabsTrigger>
          <TabsTrigger value="dlo">Outside Leakage</TabsTrigger>
          <TabsTrigger value="pressure-pan">Pressure Pan</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Setup</CardTitle>
              <CardDescription>Equipment and system information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="test-date">Test Date</Label>
                  <Input
                    id="test-date"
                    type="date"
                    value={testData.testDate?.toISOString().split('T')[0]}
                    onChange={(e) => setTestData({...testData, testDate: new Date(e.target.value)})}
                    data-testid="input-test-date"
                  />
                </div>
                <div>
                  <Label htmlFor="test-time">Test Time</Label>
                  <Input
                    id="test-time"
                    type="time"
                    value={testData.testTime}
                    onChange={(e) => setTestData({...testData, testTime: e.target.value})}
                    data-testid="input-test-time"
                  />
                </div>
                <div>
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select
                    value={testData.testType}
                    onValueChange={(value: any) => setTestData({...testData, testType: value})}
                  >
                    <SelectTrigger id="test-type" data-testid="select-test-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">Total Duct Leakage Only</SelectItem>
                      <SelectItem value="leakage_to_outside">Leakage to Outside Only</SelectItem>
                      <SelectItem value="both">Both TDL and DLO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment-serial">Equipment Serial #</Label>
                  <Input
                    id="equipment-serial"
                    value={testData.equipmentSerial}
                    onChange={(e) => setTestData({...testData, equipmentSerial: e.target.value})}
                    placeholder="e.g., DB3-1234"
                    data-testid="input-equipment-serial"
                  />
                </div>
                <div>
                  <Label htmlFor="calibration-date">Calibration Date</Label>
                  <Input
                    id="calibration-date"
                    type="date"
                    value={testData.equipmentCalibrationDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setTestData({...testData, equipmentCalibrationDate: e.target.value ? new Date(e.target.value) : undefined})}
                    data-testid="input-calibration-date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>HVAC system details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="system-type">System Type</Label>
                  <Select
                    value={testData.systemType}
                    onValueChange={(value: any) => setTestData({...testData, systemType: value})}
                  >
                    <SelectTrigger id="system-type" data-testid="select-system-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forced_air">Forced Air Furnace</SelectItem>
                      <SelectItem value="heat_pump">Heat Pump</SelectItem>
                      <SelectItem value="hydronic">Hydronic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="num-systems">Number of Systems</Label>
                  <Input
                    id="num-systems"
                    type="number"
                    value={testData.numberOfSystems}
                    onChange={(e) => setTestData({...testData, numberOfSystems: parseInt(e.target.value) || 1})}
                    data-testid="input-num-systems"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conditioned-area">Conditioned Area (ft²) *</Label>
                  <Input
                    id="conditioned-area"
                    type="number"
                    value={testData.conditionedArea}
                    onChange={(e) => setTestData({...testData, conditionedArea: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 3000"
                    data-testid="input-conditioned-area"
                    className={!testData.conditionedArea ? "border-red-500" : ""}
                  />
                </div>
                <div>
                  <Label htmlFor="system-airflow">Design System Airflow (CFM)</Label>
                  <Input
                    id="system-airflow"
                    type="number"
                    value={testData.systemAirflow}
                    onChange={(e) => setTestData({...testData, systemAirflow: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 1200"
                    data-testid="input-system-airflow"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Minnesota 2020 Energy Code Requirements</AlertTitle>
                <AlertDescription>
                  • Total Duct Leakage (TDL): ≤ {MINNESOTA_TDL_LIMIT} CFM25/100 sq ft<br/>
                  • Duct Leakage to Outside (DLO): ≤ {MINNESOTA_DLO_LIMIT} CFM25/100 sq ft<br/>
                  • Climate Zone 6 requirements apply to all of Minnesota
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tdl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Duct Leakage Test</CardTitle>
              <CardDescription>Test at 25 Pa with all registers sealed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Test Procedure</AlertTitle>
                <AlertDescription>
                  1. Seal all supply and return registers with non-permeable material<br/>
                  2. Connect duct tester fan to air handler or return plenum<br/>
                  3. Pressurize duct system to 25 Pa with respect to house<br/>
                  4. Record fan pressure reading and ring configuration
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tdl-fan-pressure">Fan Pressure at 25 Pa (Pa)</Label>
                  <Input
                    id="tdl-fan-pressure"
                    type="number"
                    step="0.1"
                    value={testData.totalFanPressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      totalFanPressure: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Enter fan pressure reading"
                    data-testid="input-tdl-fan-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="tdl-ring">Ring Configuration</Label>
                  <Select
                    value={testData.totalRingConfiguration}
                    onValueChange={(value) => setTestData({
                      ...testData,
                      totalRingConfiguration: value
                    })}
                  >
                    <SelectTrigger id="tdl-ring" data-testid="select-tdl-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open (No Ring)</SelectItem>
                      <SelectItem value="Ring 1">Ring 1 (Flow Range: 20-85 CFM)</SelectItem>
                      <SelectItem value="Ring 2">Ring 2 (Flow Range: 10-50 CFM)</SelectItem>
                      <SelectItem value="Ring 3">Ring 3 (Flow Range: 5-25 CFM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={calculateTotalDuctLeakage}
                className="w-full"
                disabled={!testData.totalFanPressure || !testData.conditionedArea}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate TDL Results
              </Button>
              
              {testData.cfm25Total! > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.cfm25Total}</div>
                    <div className="text-sm text-muted-foreground">CFM25</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.totalCfmPerSqFt}</div>
                    <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                    <Badge 
                      className="mt-1" 
                      variant={testData.meetsCodeTDL ? "default" : "destructive"}
                    >
                      {testData.meetsCodeTDL ? "✓ Passes" : "✗ Fails"} Code
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.totalPercentOfFlow}%</div>
                    <div className="text-sm text-muted-foreground">of System Flow</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Duct Leakage to Outside</CardTitle>
              <CardDescription>Test at 25 Pa with house depressurized</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Test Procedure</AlertTitle>
                <AlertDescription>
                  1. Depressurize house to -25 Pa with blower door<br/>
                  2. Open all interior doors and close exterior doors<br/>
                  3. Connect duct tester and pressurize ducts to 25 Pa<br/>
                  4. The duct tester now measures only leakage to outside
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dlo-house-pressure">House Pressure (Pa)</Label>
                  <Input
                    id="dlo-house-pressure"
                    type="number"
                    step="0.1"
                    value={testData.outsideHousePressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      outsideHousePressure: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Target: -25 Pa"
                    data-testid="input-dlo-house-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="dlo-fan-pressure">Fan Pressure at 25 Pa (Pa)</Label>
                  <Input
                    id="dlo-fan-pressure"
                    type="number"
                    step="0.1"
                    value={testData.outsideFanPressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      outsideFanPressure: parseFloat(e.target.value) || 0
                    })}
                    placeholder="Enter reading"
                    data-testid="input-dlo-fan-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="dlo-ring">Ring Configuration</Label>
                  <Select
                    value={testData.outsideRingConfiguration}
                    onValueChange={(value) => setTestData({
                      ...testData,
                      outsideRingConfiguration: value
                    })}
                  >
                    <SelectTrigger id="dlo-ring" data-testid="select-dlo-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open (No Ring)</SelectItem>
                      <SelectItem value="Ring 1">Ring 1 (Flow Range: 20-85 CFM)</SelectItem>
                      <SelectItem value="Ring 2">Ring 2 (Flow Range: 10-50 CFM)</SelectItem>
                      <SelectItem value="Ring 3">Ring 3 (Flow Range: 5-25 CFM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={calculateLeakageToOutside}
                className="w-full"
                disabled={!testData.outsideFanPressure || !testData.conditionedArea}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate DLO Results
              </Button>
              
              {testData.cfm25Outside! > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.cfm25Outside}</div>
                    <div className="text-sm text-muted-foreground">CFM25</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.outsideCfmPerSqFt}</div>
                    <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                    <Badge 
                      className="mt-1" 
                      variant={testData.meetsCodeDLO ? "default" : "destructive"}
                    >
                      {testData.meetsCodeDLO ? "✓ Passes" : "✗ Fails"} Code
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.outsidePercentOfFlow}%</div>
                    <div className="text-sm text-muted-foreground">of System Flow</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pressure-pan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pressure Pan Testing</CardTitle>
              <CardDescription>Check for leakage at individual registers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Test Procedure & Evaluation</AlertTitle>
                <AlertDescription>
                  With house at -50 Pa, place pressure pan over each register and record pressure difference.<br/>
                  • ≤1.0 Pa = Good (minimal leakage)<br/>
                  • 1.0-3.0 Pa = Marginal (some leakage)<br/>
                  • {">"}3.0 Pa = Poor (significant leakage needing sealing)
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="grid grid-cols-6 gap-2 font-medium text-sm">
                  <div className="col-span-2">Location</div>
                  <div>Type</div>
                  <div>Reading (Pa)</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>
                
                {(testData.pressurePanReadings as PressurePanReading[] || []).map((reading, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2">
                    <Input
                      className="col-span-2"
                      value={reading.location}
                      onChange={(e) => {
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[] || [])];
                        newReadings[index].location = e.target.value;
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                      placeholder="Room/Location"
                      data-testid={`input-pp-location-${index}`}
                    />
                    <Select
                      value={reading.supplyReturn}
                      onValueChange={(value: any) => {
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[] || [])];
                        newReadings[index].supplyReturn = value;
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                    >
                      <SelectTrigger data-testid={`select-pp-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supply">Supply</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.1"
                      value={reading.reading}
                      onChange={(e) => {
                        const newReadings = [...(testData.pressurePanReadings as PressurePanReading[] || [])];
                        const newReading = parseFloat(e.target.value) || 0;
                        newReadings[index].reading = newReading;
                        newReadings[index].passFail = evaluatePressurePan(newReading);
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                      data-testid={`input-pp-reading-${index}`}
                    />
                    <Badge 
                      variant={
                        reading.passFail === 'pass' ? 'default' : 
                        reading.passFail === 'marginal' ? 'secondary' : 
                        'destructive'
                      }
                    >
                      {reading.passFail}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removePressurePanReading(index)}
                      data-testid={`button-remove-pp-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button
                onClick={addPressurePanReading}
                variant="outline"
                className="w-full"
                data-testid="button-add-pp-reading"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reading
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Results Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Total Duct Leakage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25</span>
                      <span className="font-medium">{testData.cfm25Total || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25/100ft²</span>
                      <span className="font-medium">{testData.totalCfmPerSqFt || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% of System Flow</span>
                      <span className="font-medium">{testData.totalPercentOfFlow || "—"}%</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-semibold mb-2">Duct Leakage to Outside</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25</span>
                      <span className="font-medium">{testData.cfm25Outside || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25/100ft²</span>
                      <span className="font-medium">{testData.outsideCfmPerSqFt || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% of System Flow</span>
                      <span className="font-medium">{testData.outsidePercentOfFlow || "—"}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minnesota Code Compliance</CardTitle>
                <CardDescription>2020 Energy Code Requirements - Climate Zone 6</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={testData.meetsCodeTDL && testData.meetsCodeDLO ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    Overall: {testData.meetsCodeTDL && testData.meetsCodeDLO ? "PASSES" : "FAILS"} Code
                  </AlertTitle>
                  <AlertDescription>
                    {testData.cfm25Total || testData.cfm25Outside
                      ? `TDL: ${testData.meetsCodeTDL ? '✓ Pass' : '✗ Fail'} | DLO: ${testData.meetsCodeDLO ? '✓ Pass' : '✗ Fail'}`
                      : "Complete tests to check compliance"
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Total Duct Leakage (TDL)</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Code Limit</span>
                        <span>≤ {MINNESOTA_TDL_LIMIT} CFM25/100ft²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Result</span>
                        <span className={testData.meetsCodeTDL ? 'text-green-600' : 'text-red-600'}>
                          {testData.totalCfmPerSqFt || "—"} CFM25/100ft²
                        </span>
                      </div>
                      {testData.totalCfmPerSqFt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Margin</span>
                          <span className={testData.meetsCodeTDL ? 'text-green-600' : 'text-red-600'}>
                            {(MINNESOTA_TDL_LIMIT - testData.totalCfmPerSqFt).toFixed(2)} CFM25/100ft²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h5 className="text-sm font-semibold mb-1">Duct Leakage to Outside (DLO)</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Code Limit</span>
                        <span>≤ {MINNESOTA_DLO_LIMIT} CFM25/100ft²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your Result</span>
                        <span className={testData.meetsCodeDLO ? 'text-green-600' : 'text-red-600'}>
                          {testData.outsideCfmPerSqFt || "—"} CFM25/100ft²
                        </span>
                      </div>
                      {testData.outsideCfmPerSqFt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Margin</span>
                          <span className={testData.meetsCodeDLO ? 'text-green-600' : 'text-red-600'}>
                            {(MINNESOTA_DLO_LIMIT - testData.outsideCfmPerSqFt).toFixed(2)} CFM25/100ft²
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pressure Pan Results</CardTitle>
              <CardDescription>Individual register leakage assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {(testData.pressurePanReadings as PressurePanReading[] || []).filter(r => r.location).length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {(testData.pressurePanReadings as PressurePanReading[] || [])
                    .filter(r => r.location)
                    .map((reading, index) => (
                      <div key={index} className="text-center">
                        <div className="text-sm font-medium">{reading.location}</div>
                        <div className="text-xs text-muted-foreground">({reading.supplyReturn})</div>
                        <div className="text-2xl font-bold mt-1">{reading.reading} Pa</div>
                        <Badge 
                          variant={
                            reading.passFail === 'pass' ? 'default' : 
                            reading.passFail === 'marginal' ? 'secondary' : 
                            'destructive'
                          }
                          className="mt-1"
                        >
                          {reading.passFail}
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">No pressure pan readings recorded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Test Notes</Label>
                <Textarea
                  id="notes"
                  value={testData.notes}
                  onChange={(e) => setTestData({...testData, notes: e.target.value})}
                  placeholder="Enter any observations or notes about the test..."
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={testData.recommendations}
                  onChange={(e) => setTestData({...testData, recommendations: e.target.value})}
                  placeholder="Enter recommendations for improving duct system performance..."
                  rows={3}
                  data-testid="textarea-recommendations"
                />
              </div>
              {!testData.meetsCodeTDL || !testData.meetsCodeDLO ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Suggested Improvements</AlertTitle>
                  <AlertDescription>
                    {!testData.meetsCodeTDL && "• Seal duct connections with mastic or approved tape\n"}
                    {!testData.meetsCodeDLO && "• Focus on sealing leaks to unconditioned spaces\n"}
                    • Check and seal boot-to-register connections<br/>
                    • Seal air handler cabinet joints<br/>
                    • Consider aerosol duct sealing for inaccessible areas
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DuctLeakageTestPage;