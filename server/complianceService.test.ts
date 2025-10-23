import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateJobCompliance, evaluateReportCompliance } from './complianceService';
import type { IStorage } from './storage';
import type { Job, ComplianceRule, Forecast, ReportInstance, ChecklistItem } from '../shared/schema';

class MockStorage implements IStorage {
  private jobs: Map<string, Job> = new Map();
  private forecasts: Map<string, Forecast[]> = new Map();
  private complianceRules: ComplianceRule[] = [];
  private reportInstances: Map<string, ReportInstance> = new Map();
  private checklistItems: Map<string, ChecklistItem[]> = new Map();

  setJob(job: Job) {
    this.jobs.set(job.id, job);
  }

  setForecasts(jobId: string, forecasts: Forecast[]) {
    this.forecasts.set(jobId, forecasts);
  }

  setComplianceRules(rules: ComplianceRule[]) {
    this.complianceRules = rules;
  }

  setReportInstance(report: ReportInstance) {
    this.reportInstances.set(report.id, report);
  }

  setChecklistItems(jobId: string, items: ChecklistItem[]) {
    this.checklistItems.set(jobId, items);
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getForecastsByJob(jobId: string): Promise<Forecast[]> {
    return this.forecasts.get(jobId) || [];
  }

  async getComplianceRules(): Promise<ComplianceRule[]> {
    return this.complianceRules;
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    return this.reportInstances.get(id);
  }

  async getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]> {
    return this.checklistItems.get(jobId) || [];
  }

  // Stub implementations for other required methods
  async getUser(): Promise<any> { return undefined; }
  async getUserByUsername(): Promise<any> { return undefined; }
  async createUser(): Promise<any> { return {}; }
  async createBuilder(): Promise<any> { return {}; }
  async getBuilder(): Promise<any> { return undefined; }
  async getAllBuilders(): Promise<any[]> { return []; }
  async updateBuilder(): Promise<any> { return undefined; }
  async deleteBuilder(): Promise<boolean> { return false; }
  async createJob(): Promise<any> { return {}; }
  async getAllJobs(): Promise<any[]> { return []; }
  async updateJob(): Promise<any> { return undefined; }
  async deleteJob(): Promise<boolean> { return false; }
  async createScheduleEvent(): Promise<any> { return {}; }
  async getScheduleEvent(): Promise<any> { return undefined; }
  async getScheduleEventsByJob(): Promise<any[]> { return []; }
  async getScheduleEventsByDateRange(): Promise<any[]> { return []; }
  async updateScheduleEvent(): Promise<any> { return undefined; }
  async deleteScheduleEvent(): Promise<boolean> { return false; }
  async createExpense(): Promise<any> { return {}; }
  async getExpense(): Promise<any> { return undefined; }
  async getAllExpenses(): Promise<any[]> { return []; }
  async getExpensesByJob(): Promise<any[]> { return []; }
  async updateExpense(): Promise<any> { return undefined; }
  async deleteExpense(): Promise<boolean> { return false; }
  async createMileageLog(): Promise<any> { return {}; }
  async getMileageLog(): Promise<any> { return undefined; }
  async getAllMileageLogs(): Promise<any[]> { return []; }
  async getMileageLogsByDateRange(): Promise<any[]> { return []; }
  async updateMileageLog(): Promise<any> { return undefined; }
  async deleteMileageLog(): Promise<boolean> { return false; }
  async createReportTemplate(): Promise<any> { return {}; }
  async getReportTemplate(): Promise<any> { return undefined; }
  async getAllReportTemplates(): Promise<any[]> { return []; }
  async updateReportTemplate(): Promise<any> { return undefined; }
  async deleteReportTemplate(): Promise<boolean> { return false; }
  async createReportInstance(): Promise<any> { return {}; }
  async getReportInstancesByJob(): Promise<any[]> { return []; }
  async updateReportInstance(): Promise<any> { return undefined; }
  async createPhoto(): Promise<any> { return {}; }
  async getPhoto(): Promise<any> { return undefined; }
  async getPhotosByJob(): Promise<any[]> { return []; }
  async getPhotosByChecklistItem(): Promise<any[]> { return []; }
  async updatePhoto(): Promise<any> { return undefined; }
  async deletePhoto(): Promise<boolean> { return false; }
  async createForecast(): Promise<any> { return {}; }
  async getForecast(): Promise<any> { return undefined; }
  async getAllForecasts(): Promise<any[]> { return []; }
  async updateForecast(): Promise<any> { return undefined; }
  async deleteForecast(): Promise<boolean> { return false; }
  async createChecklistItem(): Promise<any> { return {}; }
  async getChecklistItem(): Promise<any> { return undefined; }
  async updateChecklistItem(): Promise<any> { return undefined; }
  async deleteChecklistItem(): Promise<boolean> { return false; }
  async createComplianceRule(): Promise<any> { return {}; }
  async updateComplianceRule(): Promise<any> { return undefined; }
  async deleteComplianceRule(): Promise<boolean> { return false; }
  async getComplianceHistory(): Promise<any[]> { return []; }
  async createComplianceHistoryEntry(): Promise<any> { return {}; }
  async recalculateReportScore(): Promise<void> { }
}

// Minnesota Code Thresholds
const MINNESOTA_RULES: ComplianceRule[] = [
  {
    id: 'rule-tdl',
    userId: null,
    codeYear: '2020',
    metricType: 'TDL',
    threshold: '4.0',
    units: 'CFM/100 sq ft',
    severity: 'high',
    isActive: true,
    description: 'Minnesota Energy Code TDL threshold',
    createdAt: new Date(),
  },
  {
    id: 'rule-dlo',
    userId: null,
    codeYear: '2020',
    metricType: 'DLO',
    threshold: '6.0',
    units: 'CFM/100 sq ft',
    severity: 'high',
    isActive: true,
    description: 'Minnesota Energy Code DLO threshold',
    createdAt: new Date(),
  },
  {
    id: 'rule-ach50',
    userId: null,
    codeYear: '2020',
    metricType: 'ACH50',
    threshold: '5.0',
    units: 'ACH',
    severity: 'high',
    isActive: true,
    description: 'Minnesota Energy Code ACH50 threshold',
    createdAt: new Date(),
  },
];

const createTestJob = (id: string): Job => ({
  id,
  name: 'Test Job',
  address: '123 Test St',
  builderId: null,
  contractor: 'Test Contractor',
  status: 'in-progress',
  inspectionType: 'Thermal Bypass',
  scheduledDate: null,
  completedDate: null,
  completedItems: 0,
  totalItems: 52,
  priority: 'medium',
  latitude: null,
  longitude: null,
  notes: null,
  builderSignatureUrl: null,
  builderSignedAt: null,
  builderSignerName: null,
  complianceStatus: null,
  complianceFlags: null,
  lastComplianceCheck: null,
});

const createTestForecast = (
  jobId: string,
  actualTDL: string | null,
  actualDLO: string | null,
  actualACH50: string | null
): Forecast => ({
  id: 'forecast-1',
  jobId,
  predictedTDL: null,
  predictedDLO: null,
  predictedACH50: null,
  actualTDL,
  actualDLO,
  actualACH50,
  confidence: null,
});

describe('evaluateJobCompliance', () => {
  let storage: MockStorage;
  const jobId = 'job-1';

  beforeEach(() => {
    storage = new MockStorage();
    storage.setJob(createTestJob(jobId));
    storage.setComplianceRules(MINNESOTA_RULES);
  });

  describe('Edge Case 1: Zero values', () => {
    it('should be compliant when all actual values are zero', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '0', '0', '0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when TDL is zero', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '0', null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when DLO is zero', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, '0', null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when ACH50 is zero', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, '0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 2: Null/undefined actual values', () => {
    it('should return "pending" when no forecasts exist', async () => {
      storage.setForecasts(jobId, []);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('pending');
      expect(result.violations).toHaveLength(0);
    });

    it('should return "pending" when all actual values are null', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('pending');
      expect(result.violations).toHaveLength(0);
    });

    it('should return "pending" when all actual values are undefined', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, undefined, undefined, undefined),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('pending');
      expect(result.violations).toHaveLength(0);
    });

    it('should evaluate only non-null values', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.5', null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 3: Boundary thresholds (exactly at threshold)', () => {
    it('should be compliant when TDL equals threshold (4.0)', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.0', null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when DLO equals threshold (6.0)', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, '6.0', null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when ACH50 equals threshold (5.0)', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, '5.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when all values equal their thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.0', '6.0', '5.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 4: Just above thresholds', () => {
    it('should be non-compliant when TDL is 4.1', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.1', null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('TDL');
      expect(result.violations[0].actual).toBe(4.1);
      expect(result.violations[0].threshold).toBe(4.0);
    });

    it('should be non-compliant when DLO is 6.1', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, '6.1', null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('DLO');
      expect(result.violations[0].actual).toBe(6.1);
      expect(result.violations[0].threshold).toBe(6.0);
    });

    it('should be non-compliant when ACH50 is 5.1', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, '5.1'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('ACH50');
      expect(result.violations[0].actual).toBe(5.1);
      expect(result.violations[0].threshold).toBe(5.0);
    });
  });

  describe('Edge Case 5: Just below thresholds', () => {
    it('should be compliant when TDL is 3.9', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.9', null, null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when DLO is 5.9', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, '5.9', null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when ACH50 is 4.9', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, '4.9'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should be compliant when all values are just below thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.9', '5.9', '4.9'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 6: Multiple violations', () => {
    it('should report violations for all metrics when all exceed thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '5.0', '7.0', '6.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(3);
      
      const tdlViolation = result.violations.find(v => v.metricType === 'TDL');
      const dloViolation = result.violations.find(v => v.metricType === 'DLO');
      const ach50Violation = result.violations.find(v => v.metricType === 'ACH50');

      expect(tdlViolation).toBeDefined();
      expect(tdlViolation?.actual).toBe(5.0);
      expect(tdlViolation?.threshold).toBe(4.0);

      expect(dloViolation).toBeDefined();
      expect(dloViolation?.actual).toBe(7.0);
      expect(dloViolation?.threshold).toBe(6.0);

      expect(ach50Violation).toBeDefined();
      expect(ach50Violation?.actual).toBe(6.0);
      expect(ach50Violation?.threshold).toBe(5.0);
    });

    it('should report violations for two metrics', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.5', '6.5', '3.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(2);
      expect(result.violations.some(v => v.metricType === 'TDL')).toBe(true);
      expect(result.violations.some(v => v.metricType === 'DLO')).toBe(true);
      expect(result.violations.some(v => v.metricType === 'ACH50')).toBe(false);
    });
  });

  describe('Edge Case 7: Mixed compliance', () => {
    it('should be non-compliant with one violation when some metrics pass and one fails', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.0', '5.0', '6.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('ACH50');
    });

    it('should handle mix of zero, compliant, and non-compliant values', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '0', '3.0', '5.5'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('ACH50');
      expect(result.violations[0].actual).toBe(5.5);
    });

    it('should handle mix of null and non-compliant values', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, '7.0', null),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('DLO');
    });
  });

  describe('Special cases', () => {
    it('should return "unknown" when job does not exist', async () => {
      const result = await evaluateJobCompliance(storage, 'non-existent-job');

      expect(result.status).toBe('unknown');
      expect(result.violations).toHaveLength(0);
    });

    it('should handle multiple forecasts for same job', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.0', null, null),
        createTestForecast(jobId, null, '5.0', null),
        createTestForecast(jobId, null, null, '4.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });

    it('should only evaluate active rules', async () => {
      const inactiveRules = MINNESOTA_RULES.map(rule => ({ ...rule, isActive: false }));
      storage.setComplianceRules(inactiveRules);
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '10.0', '10.0', '10.0'),
      ]);

      const result = await evaluateJobCompliance(storage, jobId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });
});

describe('evaluateReportCompliance', () => {
  let storage: MockStorage;
  const jobId = 'job-1';
  const reportId = 'report-1';

  beforeEach(() => {
    storage = new MockStorage();
    storage.setJob(createTestJob(jobId));
    storage.setComplianceRules(MINNESOTA_RULES);
    storage.setReportInstance({
      id: reportId,
      jobId,
      templateId: 'template-1',
      data: '{}',
      pdfUrl: null,
      emailedTo: null,
      emailedAt: null,
      createdAt: new Date(),
      scoreSummary: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    });
  });

  describe('Edge Case 1: Zero values', () => {
    it('should be compliant when all actual values are zero', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '0', '0', '0'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 2: Null/undefined actual values', () => {
    it('should return "pending" when no forecasts exist', async () => {
      storage.setForecasts(jobId, []);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('pending');
      expect(result.violations).toHaveLength(0);
    });

    it('should return "pending" when all actual values are null', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, null, null, null),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('pending');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 3: Boundary thresholds', () => {
    it('should be compliant when all values equal their thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.0', '6.0', '5.0'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 4: Just above thresholds', () => {
    it('should be non-compliant when values are just above thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '4.1', '6.1', '5.1'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(3);
    });
  });

  describe('Edge Case 5: Just below thresholds', () => {
    it('should be compliant when all values are just below thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.9', '5.9', '4.9'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Case 6: Multiple violations', () => {
    it('should report violations for all metrics when all exceed thresholds', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '5.0', '7.0', '6.0'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(3);
    });
  });

  describe('Edge Case 7: Mixed compliance', () => {
    it('should be non-compliant when some metrics pass and one fails', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.0', '5.0', '6.0'),
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('ACH50');
    });
  });

  describe('Report-specific: Checklist items', () => {
    it('should add violations for failed compliance-related checklist items', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.0', '5.0', '4.0'),
      ]);

      storage.setChecklistItems(jobId, [
        {
          id: 'item-1',
          jobId,
          itemNumber: 1,
          title: 'ACH50 air sealing inspection',
          completed: true,
          status: 'failed',
          notes: 'Air leaks detected',
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        },
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('non-compliant');
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metricType).toBe('checklist');
      expect(result.violations[0].description).toContain('Checklist item #1 failed');
    });

    it('should be compliant when metrics pass and no checklist failures', async () => {
      storage.setForecasts(jobId, [
        createTestForecast(jobId, '3.0', '5.0', '4.0'),
      ]);

      storage.setChecklistItems(jobId, [
        {
          id: 'item-1',
          jobId,
          itemNumber: 1,
          title: 'ACH50 air sealing inspection',
          completed: true,
          status: 'passed',
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        },
      ]);

      const result = await evaluateReportCompliance(storage, reportId);

      expect(result.status).toBe('compliant');
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Special cases', () => {
    it('should return "unknown" when report does not exist', async () => {
      const result = await evaluateReportCompliance(storage, 'non-existent-report');

      expect(result.status).toBe('unknown');
      expect(result.violations).toHaveLength(0);
    });
  });
});
