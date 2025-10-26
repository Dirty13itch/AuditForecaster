import { useState } from "react";
import { useParams, Link } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Wind, 
  Gauge, 
  Calculator, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp,
  Home,
  Thermometer,
  Droplets,
  BarChart3
} from "lucide-react";

interface BlowerDoorTestData {
  // Test Information
  testDate: string;
  testTime: string;
  equipmentSerial: string;
  equipmentCalibrationDate: string;
  
  // Building Information
  houseVolume: number;
  conditionedArea: number;
  surfaceArea: number;
  numberOfStories: number;
  basementType: 'none' | 'unconditioned' | 'conditioned';
  
  // Weather Conditions
  outdoorTemp: number;
  indoorTemp: number;
  outdoorHumidity: number;
  indoorHumidity: number;
  windSpeed: number;
  barometricPressure: number;
  
  // Multi-Point Test Data
  testPoints: Array<{
    housePressure: number;
    fanPressure: number;
    cfm: number;
    ringConfiguration: string;
  }>;
  
  // Calculated Results
  cfm50: number;
  ach50: number;
  ela: number; // Effective Leakage Area
  nFactor: number; // Flow exponent
  correlationCoefficient: number;
  
  // Minnesota Code Compliance
  meetsCode: boolean;
  codeLimit: number;
  margin: number;
}

function BlowerDoorTestPage() {
  const { toast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();
  const [activeTab, setActiveTab] = useState("setup");
  
  // Test data state
  const [testData, setTestData] = useState<BlowerDoorTestData>({
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().slice(0, 5),
    equipmentSerial: "",
    equipmentCalibrationDate: "",
    houseVolume: 0,
    conditionedArea: 0,
    surfaceArea: 0,
    numberOfStories: 1,
    basementType: 'none',
    outdoorTemp: 70,
    indoorTemp: 70,
    outdoorHumidity: 50,
    indoorHumidity: 50,
    windSpeed: 0,
    barometricPressure: 29.92,
    testPoints: [
      { housePressure: 50, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 45, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 40, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 35, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 30, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 25, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
      { housePressure: 20, fanPressure: 0, cfm: 0, ringConfiguration: "Open" },
    ],
    cfm50: 0,
    ach50: 0,
    ela: 0,
    nFactor: 0.65,
    correlationCoefficient: 0,
    meetsCode: false,
    codeLimit: 5.0, // Minnesota 2020 Energy Code limit
    margin: 0,
  });

  // Fetch job data
  const { data: job } = useQuery({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Calculate CFM from fan pressure
  const calculateCFM = (fanPressure: number, ringConfig: string): number => {
    // Simplified calculation - would use actual fan calibration curve
    const baseCFM = Math.sqrt(fanPressure) * 195; // Approximate for Energy Conservatory BD3
    
    // Adjust for ring configuration
    const ringMultipliers: Record<string, number> = {
      "Open": 1.0,
      "Ring A": 0.74,
      "Ring B": 0.54,
      "Ring C": 0.36,
      "Ring D": 0.24,
    };
    
    return baseCFM * (ringMultipliers[ringConfig] || 1.0);
  };

  // Calculate multi-point regression
  const calculateRegression = () => {
    const validPoints = testData.testPoints.filter(p => p.fanPressure > 0 && p.cfm > 0);
    
    if (validPoints.length < 5) {
      toast({
        title: "Insufficient data",
        description: "Need at least 5 valid test points for accurate calculation",
        variant: "destructive",
      });
      return;
    }

    // Log-log regression to find C and n in Q = C * ΔP^n
    const x = validPoints.map(p => Math.log(p.housePressure));
    const y = validPoints.map(p => Math.log(p.cfm));
    
    const n = validPoints.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const nFactor = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const logC = (sumY - nFactor * sumX) / n;
    const C = Math.exp(logC);
    
    // Calculate CFM50
    const cfm50 = C * Math.pow(50, nFactor);
    
    // Calculate ACH50
    const ach50 = (cfm50 * 60) / testData.houseVolume;
    
    // Calculate ELA (Effective Leakage Area) at 4 Pa
    const cfm4 = C * Math.pow(4, nFactor);
    const ela = cfm4 / (2.5 * Math.sqrt(4)); // in square inches
    
    // Calculate correlation coefficient
    const yPred = x.map(xi => logC + nFactor * xi);
    const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - yPred[i], 2), 0);
    const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - sumY / n, 2), 0);
    const r2 = 1 - ssRes / ssTot;
    const r = Math.sqrt(r2);
    
    // Check Minnesota code compliance
    const meetsCode = ach50 <= testData.codeLimit;
    const margin = testData.codeLimit - ach50;
    
    setTestData(prev => ({
      ...prev,
      cfm50: Math.round(cfm50),
      ach50: parseFloat(ach50.toFixed(2)),
      ela: parseFloat(ela.toFixed(1)),
      nFactor: parseFloat(nFactor.toFixed(3)),
      correlationCoefficient: parseFloat(r.toFixed(4)),
      meetsCode,
      margin: parseFloat(margin.toFixed(2)),
    }));
    
    toast({
      title: "Calculations complete",
      description: `ACH50: ${ach50.toFixed(2)} | ${meetsCode ? '✓ Passes' : '✗ Fails'} Minnesota Code`,
    });
  };

  // Weather corrections
  const applyWeatherCorrection = () => {
    // Temperature correction factor
    const tempDiff = Math.abs(testData.outdoorTemp - testData.indoorTemp);
    const tempCorrection = 1 + (tempDiff * 0.002); // Simplified correction
    
    // Wind correction factor
    const windCorrection = 1 + (testData.windSpeed * 0.01);
    
    // Apply corrections to CFM50
    const correctedCFM50 = testData.cfm50 / (tempCorrection * windCorrection);
    const correctedACH50 = (correctedCFM50 * 60) / testData.houseVolume;
    
    setTestData(prev => ({
      ...prev,
      cfm50: Math.round(correctedCFM50),
      ach50: parseFloat(correctedACH50.toFixed(2)),
    }));
    
    toast({
      title: "Weather corrections applied",
      description: "Results adjusted for temperature and wind conditions",
    });
  };

  // Save test mutation
  const saveTest = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/blower-door-tests", "POST", {
        jobId,
        ...data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blower-door-tests"] });
      toast({
        title: "Test saved",
        description: "Blower door test data has been saved successfully.",
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
              <Wind className="h-8 w-8" />
              Blower Door Test
            </h1>
            <p className="text-muted-foreground mt-1">
              {job ? `${job.address}, ${job.city}` : `Job: ${jobId}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={testData.meetsCode ? "default" : "destructive"}>
              ACH50: {testData.ach50 || "—"}
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
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="multipoint">Multi-Point</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Setup</CardTitle>
              <CardDescription>Equipment and building information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="equipment-serial">Equipment Serial #</Label>
                  <Input
                    id="equipment-serial"
                    value={testData.equipmentSerial}
                    onChange={(e) => setTestData({...testData, equipmentSerial: e.target.value})}
                    placeholder="e.g., BD3-1234"
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
              <CardTitle>Building Information</CardTitle>
              <CardDescription>Required for ACH50 calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="house-volume">House Volume (ft³)</Label>
                  <Input
                    id="house-volume"
                    type="number"
                    value={testData.houseVolume}
                    onChange={(e) => setTestData({...testData, houseVolume: parseFloat(e.target.value)})}
                    placeholder="e.g., 24000"
                    data-testid="input-house-volume"
                  />
                </div>
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
                  <Label htmlFor="surface-area">Surface Area (ft²)</Label>
                  <Input
                    id="surface-area"
                    type="number"
                    value={testData.surfaceArea}
                    onChange={(e) => setTestData({...testData, surfaceArea: parseFloat(e.target.value)})}
                    placeholder="e.g., 5500"
                    data-testid="input-surface-area"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stories">Number of Stories</Label>
                  <Select
                    value={testData.numberOfStories.toString()}
                    onValueChange={(value) => setTestData({...testData, numberOfStories: parseInt(value)})}
                  >
                    <SelectTrigger id="stories" data-testid="select-stories">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Story</SelectItem>
                      <SelectItem value="1.5">1.5 Stories</SelectItem>
                      <SelectItem value="2">2 Stories</SelectItem>
                      <SelectItem value="2.5">2.5 Stories</SelectItem>
                      <SelectItem value="3">3 Stories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="basement">Basement Type</Label>
                  <Select
                    value={testData.basementType}
                    onValueChange={(value: any) => setTestData({...testData, basementType: value})}
                  >
                    <SelectTrigger id="basement" data-testid="select-basement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Basement</SelectItem>
                      <SelectItem value="unconditioned">Unconditioned Basement</SelectItem>
                      <SelectItem value="conditioned">Conditioned Basement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weather" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weather Conditions</CardTitle>
              <CardDescription>For weather correction calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </h4>
                  <div>
                    <Label htmlFor="outdoor-temp">Outdoor Temperature (°F)</Label>
                    <Input
                      id="outdoor-temp"
                      type="number"
                      value={testData.outdoorTemp}
                      onChange={(e) => setTestData({...testData, outdoorTemp: parseFloat(e.target.value)})}
                      data-testid="input-outdoor-temp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="indoor-temp">Indoor Temperature (°F)</Label>
                    <Input
                      id="indoor-temp"
                      type="number"
                      value={testData.indoorTemp}
                      onChange={(e) => setTestData({...testData, indoorTemp: parseFloat(e.target.value)})}
                      data-testid="input-indoor-temp"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Humidity
                  </h4>
                  <div>
                    <Label htmlFor="outdoor-humidity">Outdoor Humidity (%)</Label>
                    <Input
                      id="outdoor-humidity"
                      type="number"
                      value={testData.outdoorHumidity}
                      onChange={(e) => setTestData({...testData, outdoorHumidity: parseFloat(e.target.value)})}
                      data-testid="input-outdoor-humidity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="indoor-humidity">Indoor Humidity (%)</Label>
                    <Input
                      id="indoor-humidity"
                      type="number"
                      value={testData.indoorHumidity}
                      onChange={(e) => setTestData({...testData, indoorHumidity: parseFloat(e.target.value)})}
                      data-testid="input-indoor-humidity"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wind-speed">Wind Speed (mph)</Label>
                  <Input
                    id="wind-speed"
                    type="number"
                    value={testData.windSpeed}
                    onChange={(e) => setTestData({...testData, windSpeed: parseFloat(e.target.value)})}
                    data-testid="input-wind-speed"
                  />
                </div>
                <div>
                  <Label htmlFor="barometric">Barometric Pressure (inHg)</Label>
                  <Input
                    id="barometric"
                    type="number"
                    step="0.01"
                    value={testData.barometricPressure}
                    onChange={(e) => setTestData({...testData, barometricPressure: parseFloat(e.target.value)})}
                    data-testid="input-barometric"
                  />
                </div>
              </div>
              
              <Button 
                onClick={applyWeatherCorrection}
                variant="outline"
                className="w-full"
                disabled={!testData.cfm50}
              >
                Apply Weather Corrections
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="multipoint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Point Test Data</CardTitle>
              <CardDescription>Enter fan pressure readings at each house pressure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 font-medium text-sm">
                  <div>House ΔP (Pa)</div>
                  <div>Fan ΔP (Pa)</div>
                  <div>Ring Config</div>
                  <div>CFM</div>
                  <div>Status</div>
                </div>
                {testData.testPoints.map((point, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2">
                    <Input
                      type="number"
                      value={point.housePressure}
                      readOnly
                      className="bg-muted"
                    />
                    <Input
                      type="number"
                      value={point.fanPressure}
                      onChange={(e) => {
                        const newPoints = [...testData.testPoints];
                        newPoints[index].fanPressure = parseFloat(e.target.value) || 0;
                        newPoints[index].cfm = calculateCFM(newPoints[index].fanPressure, newPoints[index].ringConfiguration);
                        setTestData({...testData, testPoints: newPoints});
                      }}
                      placeholder="Enter reading"
                      data-testid={`input-fan-pressure-${index}`}
                    />
                    <Select
                      value={point.ringConfiguration}
                      onValueChange={(value) => {
                        const newPoints = [...testData.testPoints];
                        newPoints[index].ringConfiguration = value;
                        newPoints[index].cfm = calculateCFM(newPoints[index].fanPressure, value);
                        setTestData({...testData, testPoints: newPoints});
                      }}
                    >
                      <SelectTrigger data-testid={`select-ring-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Ring A">Ring A</SelectItem>
                        <SelectItem value="Ring B">Ring B</SelectItem>
                        <SelectItem value="Ring C">Ring C</SelectItem>
                        <SelectItem value="Ring D">Ring D</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={point.cfm ? Math.round(point.cfm) : ''}
                      readOnly
                      className="bg-muted"
                    />
                    <div className="flex items-center">
                      {point.fanPressure > 0 && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={calculateRegression}
                className="w-full mt-4"
                disabled={testData.testPoints.filter(p => p.fanPressure > 0).length < 5}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Results
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CFM50</span>
                  <span className="text-2xl font-bold">{testData.cfm50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ACH50</span>
                  <span className="text-2xl font-bold">{testData.ach50 || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ELA (in²)</span>
                  <span className="text-xl font-semibold">{testData.ela || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Flow Exponent (n)</span>
                  <span className="text-xl font-semibold">{testData.nFactor || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Correlation (r)</span>
                  <span className="text-xl font-semibold">{testData.correlationCoefficient || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Minnesota Code Compliance</CardTitle>
                <CardDescription>2020 Energy Code Requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant={testData.meetsCode ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {testData.meetsCode ? "PASSES" : "FAILS"} Code
                  </AlertTitle>
                  <AlertDescription>
                    {testData.ach50 
                      ? `ACH50: ${testData.ach50} | Limit: ${testData.codeLimit} | Margin: ${testData.margin > 0 ? '+' : ''}${testData.margin}`
                      : "Complete test to check compliance"
                    }
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Climate Zone 6 Limit</span>
                    <span className="font-medium">≤ 5.0 ACH50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Result</span>
                    <span className={`font-medium ${testData.meetsCode ? 'text-green-600' : 'text-red-600'}`}>
                      {testData.ach50 || "—"} ACH50
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Quality Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {testData.testPoints.filter(p => p.fanPressure > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Valid Test Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {testData.correlationCoefficient ? (testData.correlationCoefficient * 100).toFixed(1) : "—"}%
                  </div>
                  <div className="text-sm text-muted-foreground">Correlation</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {testData.nFactor || "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Flow Exponent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Report Summary</CardTitle>
              <CardDescription>Complete blower door test documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <h4 className="font-semibold mb-2">Test Information</h4>
                    <div className="space-y-1 text-sm">
                      <div>Date: {testData.testDate}</div>
                      <div>Time: {testData.testTime}</div>
                      <div>Equipment: {testData.equipmentSerial || "Not specified"}</div>
                      <div>Calibration: {testData.equipmentCalibrationDate || "Not specified"}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Building Data</h4>
                    <div className="space-y-1 text-sm">
                      <div>Volume: {testData.houseVolume} ft³</div>
                      <div>Conditioned Area: {testData.conditionedArea} ft²</div>
                      <div>Surface Area: {testData.surfaceArea} ft²</div>
                      <div>Stories: {testData.numberOfStories}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <h4 className="font-semibold mb-2">Weather Conditions</h4>
                    <div className="space-y-1 text-sm">
                      <div>Outdoor: {testData.outdoorTemp}°F / {testData.outdoorHumidity}%</div>
                      <div>Indoor: {testData.indoorTemp}°F / {testData.indoorHumidity}%</div>
                      <div>Wind: {testData.windSpeed} mph</div>
                      <div>Pressure: {testData.barometricPressure} inHg</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Test Results</h4>
                    <div className="space-y-1 text-sm">
                      <div className="font-bold text-lg">CFM50: {testData.cfm50}</div>
                      <div className="font-bold text-lg">ACH50: {testData.ach50}</div>
                      <div>ELA: {testData.ela} in²</div>
                      <div>n-Factor: {testData.nFactor}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h4 className="font-semibold mb-2">Compliance Status</h4>
                  <Badge 
                    variant={testData.meetsCode ? "default" : "destructive"}
                    className="text-base py-2 px-4"
                  >
                    {testData.meetsCode ? "✓ PASSES" : "✗ FAILS"} Minnesota 2020 Energy Code
                  </Badge>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Result: {testData.ach50} ACH50 | Required: ≤ {testData.codeLimit} ACH50
                  </div>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any additional observations or notes about the test..."
                    rows={4}
                    data-testid="textarea-notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BlowerDoorTestPage;