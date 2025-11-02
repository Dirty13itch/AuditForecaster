import type { IStorage } from "./storage";
import type { Job, ReportInstance, Forecast, ChecklistItem, ComplianceRule } from "@shared/schema";
import { serverLogger } from "./logger";
import { safeParseFloat } from "../shared/numberUtils";

export interface ComplianceViolation {
  ruleId: string;
  metricType: string;
  threshold: number;
  actual: number;
  severity: string;
  description: string;
  units: string;
}

export interface ComplianceFlag {
  metricType: string;
  severity: string;
  description: string;
}

export interface ComplianceEvaluation {
  status: "compliant" | "non-compliant" | "pending" | "unknown";
  violations: ComplianceViolation[];
  evaluatedAt: Date;
}

export async function evaluateJobCompliance(
  storage: IStorage,
  jobId: string
): Promise<ComplianceEvaluation> {
  const evaluatedAt = new Date();
  const violations: ComplianceViolation[] = [];

  try {
    const job = await storage.getJob(jobId);
    if (!job) {
      return {
        status: "unknown",
        violations: [],
        evaluatedAt,
      };
    }

    const forecasts = await storage.getForecastsByJob(jobId);
    const activeRules = await storage.getComplianceRules();

    if (forecasts.length === 0) {
      return {
        status: "pending",
        violations: [],
        evaluatedAt,
      };
    }

    let hasActualValues = false;

    for (const forecast of forecasts) {
      if (forecast.actualTdl !== null && forecast.actualTdl !== undefined) {
        hasActualValues = true;
        const tdlRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "TDL"
        );

        for (const rule of tdlRules) {
          const actualValue = safeParseFloat(forecast.actualTdl?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `TDL actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }

      if (forecast.actualDlo !== null && forecast.actualDlo !== undefined) {
        hasActualValues = true;
        const dloRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "DLO"
        );

        for (const rule of dloRules) {
          const actualValue = safeParseFloat(forecast.actualDlo?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `DLO actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }

      if (forecast.actualAch50 !== null && forecast.actualAch50 !== undefined) {
        hasActualValues = true;
        const ach50Rules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "ACH50"
        );

        for (const rule of ach50Rules) {
          const actualValue = safeParseFloat(forecast.actualAch50?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `ACH50 actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }
    }

    if (!hasActualValues) {
      return {
        status: "pending",
        violations: [],
        evaluatedAt,
      };
    }

    return {
      status: violations.length > 0 ? "non-compliant" : "compliant",
      violations,
      evaluatedAt,
    };
  } catch (error) {
    serverLogger.error(`Error evaluating job compliance for job ${jobId}:`, error);
    return {
      status: "unknown",
      violations: [],
      evaluatedAt,
    };
  }
}

export async function evaluateReportCompliance(
  storage: IStorage,
  reportId: string
): Promise<ComplianceEvaluation> {
  const evaluatedAt = new Date();
  const violations: ComplianceViolation[] = [];

  try {
    const report = await storage.getReportInstance(reportId);
    if (!report) {
      return {
        status: "unknown",
        violations: [],
        evaluatedAt,
      };
    }

    const forecasts = await storage.getForecastsByJob(report.jobId);
    const checklistItems = await storage.getChecklistItemsByJob(report.jobId);
    const activeRules = await storage.getComplianceRules();

    let hasActualValues = false;

    for (const forecast of forecasts) {
      if (forecast.actualTdl !== null && forecast.actualTdl !== undefined) {
        hasActualValues = true;
        const tdlRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "TDL"
        );

        for (const rule of tdlRules) {
          const actualValue = safeParseFloat(forecast.actualTdl?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `TDL actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }

      if (forecast.actualDlo !== null && forecast.actualDlo !== undefined) {
        hasActualValues = true;
        const dloRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "DLO"
        );

        for (const rule of dloRules) {
          const actualValue = safeParseFloat(forecast.actualDlo?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `DLO actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }

      if (forecast.actualAch50 !== null && forecast.actualAch50 !== undefined) {
        hasActualValues = true;
        const ach50Rules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "ACH50"
        );

        for (const rule of ach50Rules) {
          const actualValue = safeParseFloat(forecast.actualAch50?.toString(), 0);
          const thresholdValue = safeParseFloat(rule.threshold?.toString(), 0);

          if (actualValue > thresholdValue) {
            violations.push({
              ruleId: rule.id,
              metricType: rule.metricType,
              threshold: thresholdValue,
              actual: actualValue,
              severity: rule.severity,
              description: rule.description || `ACH50 actual (${actualValue}) exceeds threshold (${thresholdValue})`,
              units: rule.units,
            });
          }
        }
      }
    }

    const complianceRelatedKeywords = ['ACH50', 'insulation', 'HVAC', 'air sealing', 'duct', 'thermal'];
    const failedComplianceItems = checklistItems.filter((item) => {
      const isFailed = item.status === 'failed';
      const isComplianceRelated = complianceRelatedKeywords.some(keyword =>
        item.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(keyword.toLowerCase()))
      );
      return isFailed && isComplianceRelated;
    });

    if (failedComplianceItems.length > 0) {
      hasActualValues = true;
      for (const item of failedComplianceItems) {
        violations.push({
          ruleId: "checklist-compliance",
          metricType: "checklist",
          threshold: 0,
          actual: 1,
          severity: "high",
          description: `Checklist item #${item.itemNumber} failed: ${item.title}`,
          units: "item",
        });
      }
    }

    if (!hasActualValues) {
      return {
        status: "pending",
        violations: [],
        evaluatedAt,
      };
    }

    return {
      status: violations.length > 0 ? "non-compliant" : "compliant",
      violations,
      evaluatedAt,
    };
  } catch (error) {
    serverLogger.error(`Error evaluating report compliance for report ${reportId}:`, error);
    return {
      status: "unknown",
      violations: [],
      evaluatedAt,
    };
  }
}

export async function updateJobComplianceStatus(
  storage: IStorage,
  jobId: string
): Promise<void> {
  try {
    // Fetch the job
    const job = await storage.getJob(jobId);
    if (!job) {
      serverLogger.warn(`[Compliance] Job ${jobId} not found`);
      return;
    }

    // Fetch active compliance rules from database
    const rules = await storage.getComplianceRules();
    const activeRules = rules.filter(r => r.isActive);
    
    // Fetch latest tests
    const blowerDoorTest = await storage.getLatestBlowerDoorTest(jobId);
    const allDuctTests = await storage.getDuctLeakageTestsByJob(jobId);
    const ventilationTest = await storage.getLatestVentilationTest(jobId);
    
    // Find latest DLO and TDL tests separately
    const dloTest = allDuctTests.find(test => test.testType === 'DLO');
    const tdlTest = allDuctTests.find(test => test.testType === 'TDL');

    const violations: ComplianceViolation[] = [];
    const testResults: any = {};
    
    // Dynamic compliance checks using rules from database
    
    // Blower Door: ACH50 check using dynamic rules
    if (blowerDoorTest && blowerDoorTest.ach50 !== null && blowerDoorTest.ach50 !== undefined) {
      const ach50 = typeof blowerDoorTest.ach50 === 'string' 
        ? safeParseFloat(blowerDoorTest.ach50, 0) 
        : blowerDoorTest.ach50;
      
      testResults.ACH50 = ach50;
      
      // Find matching ACH50 rule (prefer 2020 code year)
      const ach50Rule = activeRules.find(r => r.metricType === 'ACH50' && r.codeYear === '2020') 
                     || activeRules.find(r => r.metricType === 'ACH50');
      
      if (ach50Rule) {
        const thresholdValue = safeParseFloat(ach50Rule.threshold?.toString(), 0);
        if (ach50 > thresholdValue) {
          violations.push({
            ruleId: ach50Rule.id,
            metricType: 'ACH50',
            threshold: thresholdValue,
            actual: ach50,
            units: ach50Rule.units,
            severity: ach50Rule.severity,
            description: ach50Rule.description || `ACH50 = ${ach50.toFixed(2)} exceeds limit of ${thresholdValue}`
          });
          serverLogger.info(`[Compliance] Job ${jobId}: ACH50 ${ach50} exceeds ${thresholdValue} threshold (rule ${ach50Rule.id})`);
        }
      } else {
        serverLogger.warn(`[Compliance] Job ${jobId}: No ACH50 compliance rule found, skipping check`);
      }
    }
    
    // Duct Leakage (DLO) check using dynamic rules
    if (dloTest && dloTest.leakageRate !== null && dloTest.leakageRate !== undefined) {
      const leakageRate = typeof dloTest.leakageRate === 'string' 
        ? safeParseFloat(dloTest.leakageRate, 0) 
        : dloTest.leakageRate;
      
      testResults.DLO = leakageRate;
      
      // Find matching DLO rule (prefer 2020 code year)
      const dloRule = activeRules.find(r => r.metricType === 'DLO' && r.codeYear === '2020')
                   || activeRules.find(r => r.metricType === 'DLO');
      
      if (dloRule) {
        const thresholdValue = safeParseFloat(dloRule.threshold?.toString(), 0);
        if (leakageRate > thresholdValue) {
          violations.push({
            ruleId: dloRule.id,
            metricType: 'DLO',
            threshold: thresholdValue,
            actual: leakageRate,
            units: dloRule.units,
            severity: dloRule.severity,
            description: dloRule.description || `DLO = ${leakageRate.toFixed(2)} ${dloRule.units} exceeds limit of ${thresholdValue}`
          });
          serverLogger.info(`[Compliance] Job ${jobId}: DLO ${leakageRate} exceeds ${thresholdValue} threshold (rule ${dloRule.id})`);
        }
      } else {
        serverLogger.warn(`[Compliance] Job ${jobId}: No DLO compliance rule found, skipping check`);
      }
    }
    
    // Duct Leakage (TDL) check using dynamic rules
    if (tdlTest && tdlTest.leakageRate !== null && tdlTest.leakageRate !== undefined) {
      const leakageRate = typeof tdlTest.leakageRate === 'string' 
        ? safeParseFloat(tdlTest.leakageRate, 0) 
        : tdlTest.leakageRate;
      
      testResults.TDL = leakageRate;
      
      // Find matching TDL rule (prefer 2020 code year)
      const tdlRule = activeRules.find(r => r.metricType === 'TDL' && r.codeYear === '2020')
                   || activeRules.find(r => r.metricType === 'TDL');
      
      if (tdlRule) {
        const thresholdValue = safeParseFloat(tdlRule.threshold?.toString(), 0);
        if (leakageRate > thresholdValue) {
          violations.push({
            ruleId: tdlRule.id,
            metricType: 'TDL',
            threshold: thresholdValue,
            actual: leakageRate,
            units: tdlRule.units,
            severity: tdlRule.severity,
            description: tdlRule.description || `TDL = ${leakageRate.toFixed(2)} ${tdlRule.units} exceeds limit of ${thresholdValue}`
          });
          serverLogger.info(`[Compliance] Job ${jobId}: TDL ${leakageRate} exceeds ${thresholdValue} threshold (rule ${tdlRule.id})`);
        }
      } else {
        serverLogger.warn(`[Compliance] Job ${jobId}: No TDL compliance rule found, skipping check`);
      }
    }
    
    // Ventilation check using dynamic rules
    if (ventilationTest && ventilationTest.complianceStatus !== null && 
        ventilationTest.complianceStatus !== undefined) {
      testResults.ventilation = ventilationTest.complianceStatus;
      
      // Find matching VENTILATION rule (prefer 2020 code year)
      const ventRule = activeRules.find(r => r.metricType === 'VENTILATION' && r.codeYear === '2020')
                    || activeRules.find(r => r.metricType === 'VENTILATION');
      
      if (ventRule) {
        // For ventilation, the threshold is expected status (e.g., "passing")
        // Non-passing status is a violation
        if (ventilationTest.complianceStatus !== 'passing') {
          violations.push({
            ruleId: ventRule.id,
            metricType: 'VENTILATION',
            threshold: 0, // 0 failures expected
            actual: 1, // 1 failure detected
            units: ventRule.units,
            severity: ventRule.severity,
            description: ventRule.description || `Ventilation test status is ${ventilationTest.complianceStatus}, expected passing`
          });
          serverLogger.info(`[Compliance] Job ${jobId}: Ventilation status ${ventilationTest.complianceStatus} is not passing (rule ${ventRule.id})`);
        }
      } else {
        serverLogger.warn(`[Compliance] Job ${jobId}: No VENTILATION compliance rule found, skipping check`);
      }
    }
    
    // Check for missing required tests on Final inspections
    if (job.inspectionType === 'Final' || job.inspectionType === 'final') {
      if (!blowerDoorTest) {
        violations.push({
          ruleId: 'missing-test-blower-door',
          metricType: 'MISSING_BLOWER_DOOR',
          threshold: 1,
          actual: 0,
          units: 'test',
          severity: 'critical',
          description: 'Final inspection requires blower door test'
        });
        serverLogger.warn(`[Compliance] Job ${jobId}: Missing required blower door test for Final inspection`);
      }
      
      if (!dloTest && !tdlTest) {
        violations.push({
          ruleId: 'missing-test-duct',
          metricType: 'MISSING_DUCT_TEST',
          threshold: 1,
          actual: 0,
          units: 'test',
          severity: 'critical',
          description: 'Final inspection requires duct leakage test (DLO or TDL)'
        });
        serverLogger.warn(`[Compliance] Job ${jobId}: Missing required duct leakage test for Final inspection`);
      }
      
      if (!ventilationTest) {
        violations.push({
          ruleId: 'missing-test-ventilation',
          metricType: 'MISSING_VENTILATION_TEST',
          threshold: 1,
          actual: 0,
          units: 'test',
          severity: 'critical',
          description: 'Final inspection requires ventilation test'
        });
        serverLogger.warn(`[Compliance] Job ${jobId}: Missing required ventilation test for Final inspection`);
      }
    }
    
    // Determine overall compliance status
    const complianceStatus = violations.length === 0 ? 'passing' : 'failing';
    const lastComplianceCheck = new Date();
    
    // Prepare job update data
    const jobUpdateData: Partial<Job> = {
      complianceStatus,
      complianceFlags: violations.length > 0 ? violations.map(v => ({
        metricType: v.metricType,
        severity: v.severity,
        description: v.description
      })) : null,
      lastComplianceCheck,
    };
    
    // If compliance is failing AND job status is 'in-progress', update status to 'review'
    if (complianceStatus === 'failing' && job.status === 'in-progress') {
      jobUpdateData.status = 'review';
      serverLogger.warn(`[Compliance] Job ${jobId} status changed from 'in-progress' to 'review' due to failing compliance`);
    }
    
    // Update the job
    const updatedJob = await storage.updateJob(jobId, jobUpdateData);
    
    // Insert compliance history record for audit trail with full violation details
    try {
      await storage.createComplianceHistoryEntry({
        entityType: 'job',
        entityId: jobId,
        evaluatedAt: lastComplianceCheck,
        status: complianceStatus,
        violations: violations.length > 0 ? violations : null,
        ruleSnapshot: {
          testResults,
          inspectionType: job.inspectionType,
          appliedRules: activeRules.map(r => ({
            id: r.id,
            metricType: r.metricType,
            codeYear: r.codeYear,
            threshold: r.threshold,
            units: r.units,
            severity: r.severity,
            description: r.description
          }))
        }
      });
      serverLogger.info(`[Compliance] Compliance history entry created for job ${jobId} with ${violations.length} violations`);
    } catch (historyError) {
      serverLogger.error(`[Compliance] Failed to create compliance history for job ${jobId}:`, historyError);
    }
    
    // Send billing-ready notification if job is completed and passing
    if (job.status === 'completed' && complianceStatus === 'passing') {
      try {
        await storage.createNotification({
          userId: job.createdBy || job.assignedTo || '',
          type: 'job_ready_for_billing',
          title: `Job Ready for Billing: ${job.name}`,
          message: 'All tests passing, ready to generate invoice',
          relatedEntityType: 'job',
          relatedEntityId: jobId,
          priority: 'normal',
          isRead: false
        });
        serverLogger.info(`[Compliance] Job ${jobId} ready for billing - notification sent`);
      } catch (notificationError) {
        serverLogger.error(`[Compliance] Failed to send billing notification for job ${jobId}:`, notificationError);
      }
    }
    
    serverLogger.info(`[Compliance] Job ${jobId} updated: status=${complianceStatus}, violations=${JSON.stringify(violations)}`);
  } catch (error) {
    serverLogger.error(`[Compliance] Error updating job compliance status for job ${jobId}:`, error);
  }
}

export async function updateReportComplianceStatus(
  storage: IStorage,
  reportId: string
): Promise<ReportInstance | undefined> {
  try {
    const evaluation = await evaluateReportCompliance(storage, reportId);
    const activeRules = await storage.getComplianceRules();

    const updatedReport = await storage.updateReportInstance(reportId, {
      complianceStatus: evaluation.status,
      complianceFlags: evaluation.violations.length > 0
        ? evaluation.violations.map(v => ({
            metricType: v.metricType,
            severity: v.severity,
            description: v.description,
          }))
        : null,
      lastComplianceCheck: evaluation.evaluatedAt,
    });

    await storage.createComplianceHistoryEntry({
      entityType: "report",
      entityId: reportId,
      evaluatedAt: evaluation.evaluatedAt,
      status: evaluation.status,
      violations: evaluation.violations,
      ruleSnapshot: activeRules.filter(r => r.isActive),
    });

    return updatedReport;
  } catch (error) {
    serverLogger.error(`Error updating report compliance status for report ${reportId}:`, error);
    return undefined;
  }
}
