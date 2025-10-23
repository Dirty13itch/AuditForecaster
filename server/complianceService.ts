import type { IStorage } from "./storage";
import type { Job, ReportInstance, Forecast, ChecklistItem, ComplianceRule } from "@shared/schema";
import { serverLogger } from "./logger";

export interface ComplianceViolation {
  ruleId: string;
  metricType: string;
  threshold: number;
  actual: number;
  severity: string;
  description: string;
  units: string;
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
      if (forecast.actualTDL !== null && forecast.actualTDL !== undefined) {
        hasActualValues = true;
        const tdlRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "TDL"
        );

        for (const rule of tdlRules) {
          const actualValue = parseFloat(forecast.actualTDL.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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

      if (forecast.actualDLO !== null && forecast.actualDLO !== undefined) {
        hasActualValues = true;
        const dloRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "DLO"
        );

        for (const rule of dloRules) {
          const actualValue = parseFloat(forecast.actualDLO.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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

      if (forecast.actualACH50 !== null && forecast.actualACH50 !== undefined) {
        hasActualValues = true;
        const ach50Rules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "ACH50"
        );

        for (const rule of ach50Rules) {
          const actualValue = parseFloat(forecast.actualACH50.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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
      if (forecast.actualTDL !== null && forecast.actualTDL !== undefined) {
        hasActualValues = true;
        const tdlRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "TDL"
        );

        for (const rule of tdlRules) {
          const actualValue = parseFloat(forecast.actualTDL.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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

      if (forecast.actualDLO !== null && forecast.actualDLO !== undefined) {
        hasActualValues = true;
        const dloRules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "DLO"
        );

        for (const rule of dloRules) {
          const actualValue = parseFloat(forecast.actualDLO.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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

      if (forecast.actualACH50 !== null && forecast.actualACH50 !== undefined) {
        hasActualValues = true;
        const ach50Rules = activeRules.filter(
          (rule) => rule.isActive && rule.metricType === "ACH50"
        );

        for (const rule of ach50Rules) {
          const actualValue = parseFloat(forecast.actualACH50.toString());
          const thresholdValue = parseFloat(rule.threshold.toString());

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
): Promise<Job | undefined> {
  try {
    const evaluation = await evaluateJobCompliance(storage, jobId);
    const activeRules = await storage.getComplianceRules();

    const updatedJob = await storage.updateJob(jobId, {
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
      entityType: "job",
      entityId: jobId,
      evaluatedAt: evaluation.evaluatedAt,
      status: evaluation.status,
      violations: evaluation.violations,
      ruleSnapshot: activeRules.filter(r => r.isActive),
    });

    return updatedJob;
  } catch (error) {
    serverLogger.error(`Error updating job compliance status for job ${jobId}:`, error);
    return undefined;
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
