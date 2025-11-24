/**
 * Blower Door Testing Service
 * 
 * Core calculation functions for RESNET-certified blower door testing
 * Used for Minnesota 2020 Energy Code compliance (ACH50 ≤ 3.0)
 * 
 * Formulas based on RESNET Standards and ASTM E779/E1827
 */

// Type-safe telemetry stubs (will be implemented with proper observability later)
interface MetricCounter {
    inc: (labels: Record<string, string>) => void;
}

// interface BreadcrumbData {
//     category: string;
//     message: string;
//     data?: Record<string, unknown>;
//     level?: 'info' | 'warning' | 'error';
// }

const blowerDoorTestsTotal: MetricCounter = {
    inc: () => { /* Will be implemented with telemetry */ }
};

const addBreadcrumb = () => {
    /* Will be implemented with logging framework */
};

export interface WeatherConditions {
    indoorTemp: number;    // Fahrenheit
    outdoorTemp: number;   // Fahrenheit
    barometricPressure: number; // inches Hg
}

export interface TestPoint {
    housePressure: number;
    fanPressure: number;
    cfm: number;
    ringConfiguration?: string;
}

export interface ComplianceResult {
    compliant: boolean;
    margin: number;  // Positive = under limit, Negative = over limit
    ach50: number;
    codeLimit: number;
    codeYear: string;
}

export interface MultiPointResult {
    average: number;
    outliers?: number[];
    hasOutliers: boolean;
}

/**
 * Calculate ACH50 (Air Changes per Hour at 50 Pascals)
 * 
 * Formula: ACH50 = (CFM50 × 60) / House Volume (cubic feet)
 * 
 * @param cfm50 - Cubic Feet per Minute at 50 Pascals pressure differential
 * @param houseVolume - Conditioned house volume in cubic feet
 * @returns ACH50 value
 * @throws Error if inputs are invalid
 */
export function calculateACH50(cfm50: number, houseVolume: number): number {
    // Add breadcrumb for calculation attempt
    addBreadcrumb();

    // Validation
    if (houseVolume <= 0) {
        const error = new Error('Volume must be greater than zero');
        addBreadcrumb();
        throw error;
    }

    if (cfm50 < 0) {
        const error = new Error('CFM50 cannot be negative');
        addBreadcrumb();
        throw error;
    }

    if (!Number.isFinite(cfm50) || !Number.isFinite(houseVolume)) {
        const error = new Error('CFM50 and volume must be finite numbers');
        addBreadcrumb();
        throw error;
    }

    // ACH50 = (CFM50 × 60 minutes/hour) / Volume
    const ach50 = (cfm50 * 60) / houseVolume;

    // Add breadcrumb for successful calculation
    addBreadcrumb();

    return Number(ach50.toFixed(2)); // Round to 2 decimal places
}

/**
 * Apply weather corrections to blower door measurements
 * 
 * Formula: Correction = √((460+IndoorTemp)/(460+OutdoorTemp)) × √(Barometric/29.92)
 * 
 * Where:
 * - 460 is the offset to convert Fahrenheit to Rankine (absolute temperature)
 * - 29.92 is standard barometric pressure in inches Hg at sea level
 * 
 * @param conditions - Weather conditions during test
 * @returns Correction factor to multiply measured CFM by
 * @throws Error if temperatures or pressure are unrealistic
 */
export function applyWeatherCorrections(conditions: WeatherConditions): number {
    const { indoorTemp, outdoorTemp, barometricPressure } = conditions;

    // Validation - check for absolute zero (-459.67°F)
    if (indoorTemp <= -459 || outdoorTemp <= -459) {
        throw new Error('Temperature below absolute zero');
    }

    // Validation - realistic barometric pressure range (20-32 inches Hg)
    if (barometricPressure < 20 || barometricPressure > 32) {
        throw new Error('Barometric pressure out of realistic range (20-32 inches Hg)');
    }

    if (!Number.isFinite(indoorTemp) || !Number.isFinite(outdoorTemp) || !Number.isFinite(barometricPressure)) {
        throw new Error('All weather parameters must be finite numbers');
    }

    // Convert to Rankine (absolute temperature)
    const indoorRankine = indoorTemp + 460;
    const outdoorRankine = outdoorTemp + 460;

    // Temperature correction factor
    const tempCorrection = Math.sqrt(indoorRankine / outdoorRankine);

    // Pressure correction factor (relative to standard 29.92 inches Hg)
    const pressureCorrection = Math.sqrt(barometricPressure / 29.92);

    // Combined correction factor
    const correctionFactor = tempCorrection * pressureCorrection;

    return Number(correctionFactor.toFixed(4)); // Round to 4 decimal places
}

/**
 * Average multiple CFM50 readings from multi-point tests
 * 
 * Standard practice is to take 5-7 pressure points and average the results
 * Optionally detects outliers (readings > 20% different from median)
 * 
 * @param cfmReadings - Array of CFM50 readings from different pressure points
 * @param detectOutliers - If true, warns about potential outliers
 * @returns Average CFM50 and outlier information
 * @throws Error if array is empty
 */
export function averageMultiPointTests(
    cfmReadings: number[],
    detectOutliers: boolean = true
): MultiPointResult {
    if (!cfmReadings || cfmReadings.length === 0) {
        throw new Error('Cannot average empty array of readings');
    }

    // Validate all readings are positive and finite
    for (const reading of cfmReadings) {
        if (reading < 0) {
            throw new Error('CFM readings cannot be negative');
        }
        if (!Number.isFinite(reading)) {
            throw new Error('All CFM readings must be finite numbers');
        }
    }

    // Calculate average
    const sum = cfmReadings.reduce((acc, val) => acc + val, 0);
    const average = sum / cfmReadings.length;

    let outliers: number[] = [];
    let hasOutliers = false;

    // Detect outliers if requested and we have enough data points
    if (detectOutliers && cfmReadings.length >= 3) {
        // Calculate median for outlier detection
        const sorted = [...cfmReadings].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        // Flag readings more than 20% different from median
        outliers = cfmReadings.filter(reading => {
            const percentDiff = Math.abs((reading - median) / median);
            return percentDiff > 0.20;
        });

        hasOutliers = outliers.length > 0;
    }

    return {
        average: Number(average.toFixed(2)),
        outliers: hasOutliers ? outliers : undefined,
        hasOutliers
    };
}

/**
 * Check Minnesota 2020 Energy Code Compliance
 * 
 * Minnesota 2020 Energy Code requirement: ACH50 ≤ 3.0
 * (5 ACH50 for Climate Zone 7, but Minnesota is Zone 6/7)
 * 
 * @param ach50 - Calculated ACH50 value
 * @param codeYear - Energy code year (default: '2020')
 * @returns Compliance result with pass/fail and margin
 */
export function checkMinnesotaCompliance(
    ach50: number,
    codeYear: string = '2020'
): ComplianceResult {
    // Add breadcrumb for compliance check
    addBreadcrumb();

    if (ach50 < 0) {
        const error = new Error('ACH50 cannot be negative');
        addBreadcrumb();
        throw error;
    }

    if (!Number.isFinite(ach50)) {
        const error = new Error('ACH50 must be a finite number');
        addBreadcrumb();
        throw error;
    }

    // Minnesota 2020 Energy Code limit
    const codeLimit = 3.0;

    const compliant = ach50 <= codeLimit;
    const margin = Number((codeLimit - ach50).toFixed(2));

    // Add breadcrumb for compliance result
    addBreadcrumb();

    // Track metrics
    blowerDoorTestsTotal.inc({ passed: String(compliant) });

    return {
        compliant,
        margin,
        ach50,
        codeLimit,
        codeYear
    };
}

/**
 * Calculate altitude correction factor
 * 
 * Adjusts for reduced air density at higher altitudes
 * Formula: Correction = √(Barometric Pressure at altitude / 29.92)
 * 
 * Approximation: Pressure (inches Hg) ≈ 29.92 × e^(-altitude / 28000)
 * 
 * @param altitudeFeet - Elevation above sea level in feet
 * @returns Correction factor (typically < 1.0 for high altitude)
 */
export function calculateAltitudeCorrection(altitudeFeet: number): number {
    if (altitudeFeet < 0) {
        throw new Error('Altitude cannot be negative');
    }

    if (!Number.isFinite(altitudeFeet)) {
        throw new Error('Altitude must be a finite number');
    }

    // At sea level, no correction needed
    if (altitudeFeet === 0) {
        return 1.0;
    }

    // Approximate barometric pressure at altitude
    // Using exponential decay model: P = 29.92 × e^(-h/28000)
    const pressureAtAltitude = 29.92 * Math.exp(-altitudeFeet / 28000);

    // Correction factor is square root of pressure ratio
    const correctionFactor = Math.sqrt(pressureAtAltitude / 29.92);

    return Number(correctionFactor.toFixed(4));
}

/**
 * Apply corrected CFM50 calculation with weather and altitude adjustments
 * 
 * @param measuredCfm - Raw CFM50 measurement
 * @param weatherConditions - Temperature and pressure conditions
 * @param altitudeFeet - Elevation above sea level
 * @returns Corrected CFM50 value
 */
export function applyCorrectedCFM50(
    measuredCfm: number,
    weatherConditions: WeatherConditions,
    altitudeFeet: number = 0
): number {
    const weatherCorrection = applyWeatherCorrections(weatherConditions);
    const altitudeCorrection = calculateAltitudeCorrection(altitudeFeet);

    const correctedCfm = measuredCfm * weatherCorrection * altitudeCorrection;

    return Number(correctedCfm.toFixed(2));
}

/**
 * Calculate Effective Leakage Area (ELA)
 * 
 * Formula: ELA = CFM50 / (2610 × √ΔP)
 * Where ΔP = 4 Pascals (reference pressure for ELA calculation)
 * 
 * @param cfm50 - Cubic Feet per Minute at 50 Pascals
 * @returns Effective Leakage Area in square inches
 */
export function calculateELA(cfm50: number): number {
    if (cfm50 < 0) {
        throw new Error('CFM50 cannot be negative');
    }

    if (!Number.isFinite(cfm50)) {
        throw new Error('CFM50 must be a finite number');
    }

    // ELA calculation at 4 Pa reference pressure
    const referencePressure = 4; // Pascals
    const ela = cfm50 / (2610 * Math.sqrt(referencePressure));

    return Number(ela.toFixed(2));
}
