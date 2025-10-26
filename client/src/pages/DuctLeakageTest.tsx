import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
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
  Network
} from "lucide-react";

interface DuctLeakageTestData {
  // Test Information
  testDate: string;
  testTime: string;
  testType: 'total' | 'leakage_to_outside' | 'both';
  equipmentSerial: string;
  equipmentCalibrationDate: string;
  
  // System Information
  systemType: 'forced_air' | 'heat_pump' | 'hydronic' | 'other';
  numberOfSystems: number;
  conditionedArea: number;
  systemAirflow: number; // Design CFM
  
  // Total Duct Leakage Test (at 25 Pa)
  totalDuctLeakage: {
    fanPressure: number;
    ringConfiguration: string;
    cfm25Total: number;
    cfmPerSqFt: number; // CFM25/100 sq ft
    percentOfFlow: number; // As % of system airflow
  };
  
  // Duct Leakage to Outside (at 25 Pa)
  leakageToOutside: {
    housePressure: number;
    fanPressure: number;
    ringConfiguration: string;
    cfm25Outside: number;
    cfmPerSqFt: number;
    percentOfFlow: number;
  };
  
  // Pressure Pan Testing
  pressurePanReadings: Array<{
    location: string;
    supplyReturn: 'supply' | 'return';
    reading: number;
    passFail: 'pass' | 'fail' | 'marginal';
  }>;
  
  // Minnesota Code Compliance
  totalDuctLeakageLimit: number; // CFM25/100 sq ft
  outsideLeakageLimit: number; // CFM25/100 sq ft
  meetsCodeTDL: boolean;
  meetsCodeDLO: boolean;
  
  // Additional Data
  notes: string;
  recommendations: string;
}

function DuctLeakageTestPage() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  
  // Test data state
  const [testData, setTestData] = useState<DuctLeakageTestData>({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().slice(0, 5),
    testType: 'both',
    equipmentSerial: "",
    equipmentCalibrationDate: "",
    systemType: 'forced_air',
    numberOfSystems: 1,
    conditionedArea: 0,
    systemAirflow: 0,
    totalDuctLeakage: {
      fanPressure: 0,
      ringConfiguration: "Open",
      cfm25Total: 0,
      cfmPerSqFt: 0,
      percentOfFlow: 0,
    },
    leakageToOutside: {
      housePressure: 0,
      fanPressure: 0,
      ringConfiguration: "Open",
      cfm25Outside: 0,
      cfmPerSqFt: 0,
      percentOfFlow: 0,
    },
    pressurePanReadings: [
      { location: "Master Bedroom", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Bedroom 2", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Bedroom 3", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Living Room", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Kitchen", supplyReturn: "supply", reading: 0, passFail: "pass" },
      { location: "Hallway", supplyReturn: "return", reading: 0, passFail: "pass" },
    ],
    totalDuctLeakageLimit: 4.0, // Minnesota 2020 Energy Code
    outsideLeakageLimit: 6.0, // Minnesota 2020 Energy Code
    meetsCodeTDL: false,
    meetsCodeDLO: false,
    notes: "",
    recommendations: "",
  });

  // Fetch job data
  const { data: job } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Calculate CFM from fan pressure
  const calculateCFM = (fanPressure: number, ringConfig: string): number => {
    // Simplified calculation - would use actual duct tester calibration
    const baseCFM = Math.sqrt(fanPressure) * 85; // Approximate for Duct Blaster
    
    // Adjust for ring configuration
    const ringMultipliers: Record<string, number> = {
      "Open": 1.0,
      "Ring 1": 0.65,
      "Ring 2": 0.42,
      "Ring 3": 0.28,
    };
    
    return baseCFM * (ringMultipliers[ringConfig] || 1.0);
  };

  // Calculate TDL results
  const calculateTotalDuctLeakage = () => {
    const cfm25 = calculateCFM(testData.totalDuctLeakage.fanPressure, testData.totalDuctLeakage.ringConfiguration);
    const cfmPerSqFt = (cfm25 / testData.conditionedArea) * 100;
    const percentOfFlow = testData.systemAirflow > 0 ? (cfm25 / testData.systemAirflow) * 100 : 0;
    const meetsCode = cfmPerSqFt <= testData.totalDuctLeakageLimit;
    
    setTestData(prev => ({
      ...prev,
      totalDuctLeakage: {
        ...prev.totalDuctLeakage,
        cfm25Total: Math.round(cfm25),
        cfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
        percentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      },
      meetsCodeTDL: meetsCode,
    }));
    
    toast({
      title: "TDL calculated",
      description: `${cfmPerSqFt.toFixed(2)} CFM25/100ft² | ${meetsCode ? '✓ Passes' : '✗ Fails'} Code`,
    });
  };

  // Calculate DLO results
  const calculateLeakageToOutside = () => {
    const cfm25 = calculateCFM(testData.leakageToOutside.fanPressure, testData.leakageToOutside.ringConfiguration);
    const cfmPerSqFt = (cfm25 / testData.conditionedArea) * 100;
    const percentOfFlow = testData.systemAirflow > 0 ? (cfm25 / testData.systemAirflow) * 100 : 0;
    const meetsCode = cfmPerSqFt <= testData.outsideLeakageLimit;
    
    setTestData(prev => ({
      ...prev,
      leakageToOutside: {
        ...prev.leakageToOutside,
        cfm25Outside: Math.round(cfm25),
        cfmPerSqFt: parseFloat(cfmPerSqFt.toFixed(2)),
        percentOfFlow: parseFloat(percentOfFlow.toFixed(1)),
      },
      meetsCodeDLO: meetsCode,
    }));
    
    toast({
      title: "DLO calculated",
      description: `${cfmPerSqFt.toFixed(2)} CFM25/100ft² | ${meetsCode ? '✓ Passes' : '✗ Fails'} Code`,
    });
  };

  // Evaluate pressure pan reading
  const evaluatePressurePan = (reading: number): 'pass' | 'fail' | 'marginal' => {
    if (reading <= 1.0) return 'pass';
    if (reading <= 3.0) return 'marginal';
    return 'fail';
  };

  // Add new pressure pan reading
  const addPressurePanReading = () => {
    setTestData(prev => ({
      ...prev,
      pressurePanReadings: [
        ...prev.pressurePanReadings,
        { location: "", supplyReturn: "supply", reading: 0, passFail: "pass" }
      ]
    }));
  };

  // Save test mutation
  const saveTest = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/duct-leakage-tests", "POST", {
        jobId,
        ...data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duct-leakage-tests"] });
      toast({
        title: "Test saved",
        description: "Duct leakage test data has been saved successfully.",
      });
    },
  });

  const handleSaveTest = () => {
    saveTest.mutate(testData);
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
              TDL: {testData.totalDuctLeakage.cfmPerSqFt || "—"} CFM25/100ft²
            </Badge>
            <Badge variant={testData.meetsCodeDLO ? "default" : "destructive"}>
              DLO: {testData.leakageToOutside.cfmPerSqFt || "—"} CFM25/100ft²
            </Badge>
            <Button
              onClick={handleSaveTest}
              disabled={saveTest.isPending}
              data-testid="button-save-test"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Test
            </Button>
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
                    value={testData.testDate}
                    onChange={(e) => setTestData({...testData, testDate: e.target.value})}
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
                    value={testData.equipmentCalibrationDate}
                    onChange={(e) => setTestData({...testData, equipmentCalibrationDate: e.target.value})}
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
                    onChange={(e) => setTestData({...testData, numberOfSystems: parseInt(e.target.value)})}
                    data-testid="input-num-systems"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conditioned-area">Conditioned Area (ft²)</Label>
                  <Input
                    id="conditioned-area"
                    type="number"
                    value={testData.conditionedArea}
                    onChange={(e) => setTestData({...testData, conditionedArea: parseFloat(e.target.value)})}
                    placeholder="e.g., 3000"
                    data-testid="input-conditioned-area"
                  />
                </div>
                <div>
                  <Label htmlFor="system-airflow">Design System Airflow (CFM)</Label>
                  <Input
                    id="system-airflow"
                    type="number"
                    value={testData.systemAirflow}
                    onChange={(e) => setTestData({...testData, systemAirflow: parseFloat(e.target.value)})}
                    placeholder="e.g., 1200"
                    data-testid="input-system-airflow"
                  />
                </div>
              </div>
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
                  1. Seal all supply and return registers<br/>
                  2. Connect duct tester to air handler<br/>
                  3. Pressurize duct system to 25 Pa<br/>
                  4. Record fan pressure reading
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tdl-fan-pressure">Fan Pressure (Pa)</Label>
                  <Input
                    id="tdl-fan-pressure"
                    type="number"
                    step="0.1"
                    value={testData.totalDuctLeakage.fanPressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      totalDuctLeakage: {
                        ...testData.totalDuctLeakage,
                        fanPressure: parseFloat(e.target.value)
                      }
                    })}
                    placeholder="Enter fan pressure reading"
                    data-testid="input-tdl-fan-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="tdl-ring">Ring Configuration</Label>
                  <Select
                    value={testData.totalDuctLeakage.ringConfiguration}
                    onValueChange={(value) => setTestData({
                      ...testData,
                      totalDuctLeakage: {
                        ...testData.totalDuctLeakage,
                        ringConfiguration: value
                      }
                    })}
                  >
                    <SelectTrigger id="tdl-ring" data-testid="select-tdl-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open (No Ring)</SelectItem>
                      <SelectItem value="Ring 1">Ring 1</SelectItem>
                      <SelectItem value="Ring 2">Ring 2</SelectItem>
                      <SelectItem value="Ring 3">Ring 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={calculateTotalDuctLeakage}
                className="w-full"
                disabled={!testData.totalDuctLeakage.fanPressure || !testData.conditionedArea}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate TDL Results
              </Button>
              
              {testData.totalDuctLeakage.cfm25Total > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.totalDuctLeakage.cfm25Total}</div>
                    <div className="text-sm text-muted-foreground">CFM25</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.totalDuctLeakage.cfmPerSqFt}</div>
                    <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.totalDuctLeakage.percentOfFlow}%</div>
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
                  2. Open all interior doors<br/>
                  3. Connect duct tester and pressurize to 25 Pa<br/>
                  4. Record house and fan pressure readings
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dlo-house-pressure">House Pressure (Pa)</Label>
                  <Input
                    id="dlo-house-pressure"
                    type="number"
                    step="0.1"
                    value={testData.leakageToOutside.housePressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      leakageToOutside: {
                        ...testData.leakageToOutside,
                        housePressure: parseFloat(e.target.value)
                      }
                    })}
                    placeholder="Target: -25"
                    data-testid="input-dlo-house-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="dlo-fan-pressure">Fan Pressure (Pa)</Label>
                  <Input
                    id="dlo-fan-pressure"
                    type="number"
                    step="0.1"
                    value={testData.leakageToOutside.fanPressure}
                    onChange={(e) => setTestData({
                      ...testData,
                      leakageToOutside: {
                        ...testData.leakageToOutside,
                        fanPressure: parseFloat(e.target.value)
                      }
                    })}
                    placeholder="Enter reading"
                    data-testid="input-dlo-fan-pressure"
                  />
                </div>
                <div>
                  <Label htmlFor="dlo-ring">Ring Configuration</Label>
                  <Select
                    value={testData.leakageToOutside.ringConfiguration}
                    onValueChange={(value) => setTestData({
                      ...testData,
                      leakageToOutside: {
                        ...testData.leakageToOutside,
                        ringConfiguration: value
                      }
                    })}
                  >
                    <SelectTrigger id="dlo-ring" data-testid="select-dlo-ring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open (No Ring)</SelectItem>
                      <SelectItem value="Ring 1">Ring 1</SelectItem>
                      <SelectItem value="Ring 2">Ring 2</SelectItem>
                      <SelectItem value="Ring 3">Ring 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={calculateLeakageToOutside}
                className="w-full"
                disabled={!testData.leakageToOutside.fanPressure || !testData.conditionedArea}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate DLO Results
              </Button>
              
              {testData.leakageToOutside.cfm25Outside > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.leakageToOutside.cfm25Outside}</div>
                    <div className="text-sm text-muted-foreground">CFM25</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.leakageToOutside.cfmPerSqFt}</div>
                    <div className="text-sm text-muted-foreground">CFM25/100ft²</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{testData.leakageToOutside.percentOfFlow}%</div>
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
                <AlertTitle>Test Procedure</AlertTitle>
                <AlertDescription>
                  With house at -50 Pa, place pressure pan over each register and record pressure difference.
                  Readings ≤1 Pa = Good | 1-3 Pa = Marginal | {">"}3 Pa = Poor
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 font-medium text-sm">
                  <div className="col-span-2">Location</div>
                  <div>Type</div>
                  <div>Reading (Pa)</div>
                  <div>Status</div>
                </div>
                
                {testData.pressurePanReadings.map((reading, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2">
                    <Input
                      className="col-span-2"
                      value={reading.location}
                      onChange={(e) => {
                        const newReadings = [...testData.pressurePanReadings];
                        newReadings[index].location = e.target.value;
                        setTestData({...testData, pressurePanReadings: newReadings});
                      }}
                      placeholder="Room/Location"
                      data-testid={`input-pp-location-${index}`}
                    />
                    <Select
                      value={reading.supplyReturn}
                      onValueChange={(value: any) => {
                        const newReadings = [...testData.pressurePanReadings];
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
                        const newReadings = [...testData.pressurePanReadings];
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
                  </div>
                ))}
              </div>
              
              <Button
                onClick={addPressurePanReading}
                variant="outline"
                className="w-full"
                data-testid="button-add-pp-reading"
              >
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
                      <span className="font-medium">{testData.totalDuctLeakage.cfm25Total || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25/100ft²</span>
                      <span className="font-medium">{testData.totalDuctLeakage.cfmPerSqFt || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% of Flow</span>
                      <span className="font-medium">{testData.totalDuctLeakage.percentOfFlow || "—"}%</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Leakage to Outside</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25</span>
                      <span className="font-medium">{testData.leakageToOutside.cfm25Outside || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CFM25/100ft²</span>
                      <span className="font-medium">{testData.leakageToOutside.cfmPerSqFt || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">% of Flow</span>
                      <span className="font-medium">{testData.leakageToOutside.percentOfFlow || "—"}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minnesota Code Compliance</CardTitle>
                <CardDescription>2020 Energy Code Requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={testData.meetsCodeTDL && testData.meetsCodeDLO ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {testData.meetsCodeTDL && testData.meetsCodeDLO ? "PASSES" : "FAILS"} Code
                  </AlertTitle>
                  <AlertDescription>
                    {testData.totalDuctLeakage.cfm25Total || testData.leakageToOutside.cfm25Outside
                      ? `TDL: ${testData.meetsCodeTDL ? '✓' : '✗'} | DLO: ${testData.meetsCodeDLO ? '✓' : '✗'}`
                      : "Complete tests to check compliance"
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div>
                    <h5 className="text-sm font-semibold">Total Duct Leakage</h5>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limit</span>
                      <span>≤ {testData.totalDuctLeakageLimit} CFM25/100ft²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Result</span>
                      <span className={testData.meetsCodeTDL ? 'text-green-600' : 'text-red-600'}>
                        {testData.totalDuctLeakage.cfmPerSqFt || "—"} CFM25/100ft²
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold">Duct Leakage to Outside</h5>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Limit</span>
                      <span>≤ {testData.outsideLeakageLimit} CFM25/100ft²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Result</span>
                      <span className={testData.meetsCodeDLO ? 'text-green-600' : 'text-red-600'}>
                        {testData.leakageToOutside.cfmPerSqFt || "—"} CFM25/100ft²
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pressure Pan Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {testData.pressurePanReadings
                  .filter(r => r.location)
                  .map((reading, index) => (
                    <div key={index} className="text-center">
                      <div className="text-sm font-medium">{reading.location}</div>
                      <div className="text-2xl font-bold mt-1">{reading.reading}</div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DuctLeakageTestPage;