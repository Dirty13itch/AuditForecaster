/**
 * Duct Leakage Testing Service
 * 
 * Core calculation functions for RESNET-certified duct leakage testing
 * Used for Minnesota 2020 Energy Code compliance:
 * - Total Duct Leakage (TDL) ≤ 4.0 CFM25 per 100 sq ft
 * - Duct Leakage to Outside (DLO) ≤ 3.0 CFM25 per 100 sq ft
 * 
 * Formulas based on RESNET Standards and ASHRAE 152
 */

import { ductLeakageTestsTotal } from './metrics';

export interface DuctComplianceResult {
  tdlCompliant: boolean;
  dloCompliant: boolean;
  overallCompliant: boolean;
  tdl: number;
  dlo: number;
  tdlLimit: number;
  dloLimit: number;
  tdlMargin: number; // Positive = under limit, Negative = over limit
  dloMargin: number;
  codeYear: string;
}

export interface CFM25Result {
  average: number;
  outliers?: number[];
  hasOutliers: boolean;
}

/**
 * Calculate Total Duct Leakage (TDL)
 * 
 * Formula: TDL = (CFM25 / Floor Area) × 100
 * 
 * Minnesota 2020 Energy Code: TDL ≤ 4.0 CFM25 per 100 sq ft
 * 
 * @param cfm25Total - Total duct leakage at 25 Pascals (CFM)
 * @param floorArea - Conditioned floor area (square feet)
 * @returns TDL in CFM25 per 100 sq ft
 * @throws Error if inputs are invalid
 */
export function calculateTDL(cfm25Total: number, floorArea: number): number {
  // Validation
  if (floorArea <= 0) {
    throw new Error('Floor area must be greater than zero');
  }
  
  if (cfm25Total < 0) {
    throw new Error('CFM25 cannot be negative');
  }

  if (!Number.isFinite(cfm25Total) || !Number.isFinite(floorArea)) {
    throw new Error('CFM25 and floor area must be finite numbers');
  }

  // TDL = (CFM25 / Floor Area) × 100
  const tdl = (cfm25Total / floorArea) * 100;
  
  return Number(tdl.toFixed(2)); // Round to 2 decimal places
}

/**
 * Calculate Duct Leakage to Outside (DLO)
 * 
 * Formula: DLO = (CFM25_outside / Floor Area) × 100
 * 
 * Minnesota 2020 Energy Code: DLO ≤ 3.0 CFM25 per 100 sq ft
 * 
 * @param cfm25Outside - Duct leakage to outside at 25 Pascals (CFM)
 * @param floorArea - Conditioned floor area (square feet)
 * @returns DLO in CFM25 per 100 sq ft
 * @throws Error if inputs are invalid
 */
export function calculateDLO(cfm25Outside: number, floorArea: number): number {
  // Validation
  if (floorArea <= 0) {
    throw new Error('Floor area must be greater than zero');
  }
  
  if (cfm25Outside < 0) {
    throw new Error('CFM25 to outside cannot be negative');
  }

  if (!Number.isFinite(cfm25Outside) || !Number.isFinite(floorArea)) {
    throw new Error('CFM25 and floor area must be finite numbers');
  }

  // DLO = (CFM25_outside / Floor Area) × 100
  const dlo = (cfm25Outside / floorArea) * 100;
  
  return Number(dlo.toFixed(2)); // Round to 2 decimal places
}

/**
 * Validate duct leakage measurements for physical consistency
 * 
 * DLO (leakage to outside) cannot exceed TDL (total leakage)
 * This is a physical impossibility and indicates measurement error
 * 
 * @param cfm25Total - Total duct leakage at 25 Pascals (CFM)
 * @param cfm25Outside - Duct leakage to outside at 25 Pascals (CFM)
 * @param floorArea - Conditioned floor area (square feet)
 * @returns Object with TDL and DLO values
 * @throws Error if DLO > TDL (physically impossible)
 */
export function validateDuctLeakage(
  cfm25Total: number,
  cfm25Outside: number,
  floorArea: number
): { tdl: number; dlo: number; valid: boolean } {
  const tdl = calculateTDL(cfm25Total, floorArea);
  const dlo = calculateDLO(cfm25Outside, floorArea);

  // DLO cannot exceed TDL (leakage to outside can't be more than total leakage)
  if (cfm25Outside > cfm25Total) {
    throw new Error(
      `DLO cannot exceed TDL: CFM25 to outside (${cfm25Outside}) > Total CFM25 (${cfm25Total}). Check measurements.`
    );
  }

  return {
    tdl,
    dlo,
    valid: true
  };
}

/**
 * Average multiple CFM25 readings from duct blaster tests
 * 
 * Standard practice is to take 3-5 readings and average the results
 * Optionally detects outliers (readings > 20% different from median)
 * 
 * @param cfm25Readings - Array of CFM25 readings from different tests
 * @param detectOutliers - If true, warns about potential outliers
 * @returns Average CFM25 and outlier information
 * @throws Error if array is empty or contains invalid readings
 */
export function averageCFM25Measurements(
  cfm25Readings: number[],
  detectOutliers: boolean = true
): CFM25Result {
  if (!cfm25Readings || cfm25Readings.length === 0) {
    throw new Error('Cannot average empty array of CFM25 readings');
  }

  // Validate all readings are positive and finite
  for (const reading of cfm25Readings) {
    if (reading < 0) {
      throw new Error('CFM25 readings cannot be negative');
    }
    if (!Number.isFinite(reading)) {
      throw new Error('All CFM25 readings must be finite numbers');
    }
  }

  // Calculate average
  const sum = cfm25Readings.reduce((acc, val) => acc + val, 0);
  const average = sum / cfm25Readings.length;

  let outliers: number[] = [];
  let hasOutliers = false;

  // Detect outliers if requested and we have enough data points
  if (detectOutliers && cfm25Readings.length >= 3) {
    // Calculate median for outlier detection
    const sorted = [...cfm25Readings].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Flag readings more than 20% different from median
    outliers = cfm25Readings.filter(reading => {
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
 * Check Minnesota 2020 Energy Code Compliance for Duct Leakage
 * 
 * Minnesota 2020 Energy Code requirements:
 * - Total Duct Leakage (TDL) ≤ 4.0 CFM25 per 100 sq ft
 * - Duct Leakage to Outside (DLO) ≤ 3.0 CFM25 per 100 sq ft
 * 
 * Both conditions must be met for overall compliance
 * 
 * @param tdl - Total Duct Leakage (CFM25 per 100 sq ft)
 * @param dlo - Duct Leakage to Outside (CFM25 per 100 sq ft)
 * @param codeYear - Energy code year (default: '2020')
 * @returns Compliance result with pass/fail for both metrics
 */
export function checkMinnesotaDuctCompliance(
  tdl: number,
  dlo: number,
  codeYear: string = '2020'
): DuctComplianceResult {
  if (tdl < 0) {
    throw new Error('TDL cannot be negative');
  }

  if (dlo < 0) {
    throw new Error('DLO cannot be negative');
  }

  if (!Number.isFinite(tdl) || !Number.isFinite(dlo)) {
    throw new Error('TDL and DLO must be finite numbers');
  }

  // Minnesota 2020 Energy Code limits
  const tdlLimit = 4.0; // CFM25 per 100 sq ft
  const dloLimit = 3.0; // CFM25 per 100 sq ft

  const tdlCompliant = tdl <= tdlLimit;
  const dloCompliant = dlo <= dloLimit;
  const overallCompliant = tdlCompliant && dloCompliant;

  const tdlMargin = Number((tdlLimit - tdl).toFixed(2));
  const dloMargin = Number((dloLimit - dlo).toFixed(2));

  // Track metrics
  ductLeakageTestsTotal.inc({ test_type: 'TDL', passed: String(tdlCompliant) });
  ductLeakageTestsTotal.inc({ test_type: 'DLO', passed: String(dloCompliant) });

  return {
    tdlCompliant,
    dloCompliant,
    overallCompliant,
    tdl,
    dlo,
    tdlLimit,
    dloLimit,
    tdlMargin,
    dloMargin,
    codeYear
  };
}

/**
 * Convert CFM measurements between different pressure differentials
 * 
 * Formula: CFM2 = CFM1 × (P2/P1)^0.6
 * 
 * The 0.6 exponent comes from the power law relationship in airflow through leaks
 * Q = C × ΔP^n, where n typically ranges from 0.5 to 0.7 (0.6 is standard for ducts)
 * 
 * Common conversions:
 * - CFM50 to CFM25 (blower door to duct testing)
 * - CFM10 to CFM25 (low pressure to standard duct testing)
 * 
 * @param cfm - Measured airflow in CFM
 * @param fromPressure - Original pressure differential in Pascals
 * @param toPressure - Target pressure differential in Pascals
 * @returns Converted CFM at target pressure
 * @throws Error if pressures are invalid
 */
export function convertPressure(
  cfm: number,
  fromPressure: number,
  toPressure: number
): number {
  if (cfm < 0) {
    throw new Error('CFM cannot be negative');
  }

  if (fromPressure <= 0 || toPressure <= 0) {
    throw new Error('Pressure differentials must be greater than zero');
  }

  if (!Number.isFinite(cfm) || !Number.isFinite(fromPressure) || !Number.isFinite(toPressure)) {
    throw new Error('All parameters must be finite numbers');
  }

  // Power law exponent for duct leakage (0.6 is standard)
  const exponent = 0.6;

  // CFM2 = CFM1 × (P2/P1)^0.6
  const convertedCfm = cfm * Math.pow(toPressure / fromPressure, exponent);

  return Number(convertedCfm.toFixed(2));
}

/**
 * Calculate duct leakage as percentage of system airflow
 * 
 * Helps assess impact on HVAC system efficiency
 * Typical acceptable ranges: < 10% for good systems, < 15% for acceptable
 * 
 * @param cfm25 - Duct leakage at 25 Pascals (CFM)
 * @param systemAirflow - Design system airflow (CFM)
 * @returns Leakage as percentage of system airflow
 * @throws Error if inputs are invalid
 */
export function calculatePercentOfSystemAirflow(
  cfm25: number,
  systemAirflow: number
): number {
  if (systemAirflow <= 0) {
    throw new Error('System airflow must be greater than zero');
  }

  if (cfm25 < 0) {
    throw new Error('CFM25 cannot be negative');
  }

  if (!Number.isFinite(cfm25) || !Number.isFinite(systemAirflow)) {
    throw new Error('CFM25 and system airflow must be finite numbers');
  }

  const percentage = (cfm25 / systemAirflow) * 100;

  return Number(percentage.toFixed(2));
}
