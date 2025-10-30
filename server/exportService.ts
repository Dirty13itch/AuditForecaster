import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { db } from './db';
import { eq, and, gte, lte, desc, asc, sql, inArray } from 'drizzle-orm';
import {
  jobs,
  builders,
  invoices,
  expenses,
  mileageLogs,
  equipment,
  equipmentCalibrations,
  qaInspectionScores,
  userAchievements,
  photos,
  checklistItems,
  forecasts,
  reportInstances,
  taxCreditProjects,
  type Job,
  type Invoice,
  type Expense,
  type MileageLog,
  type Equipment,
  type QaInspectionScore,
} from '@shared/schema';
import { serverLogger } from './logger';
import { Readable } from 'stream';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { nanoid } from 'nanoid';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  columns?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeHeaders?: boolean;
  customFileName?: string;
  emailDelivery?: {
    to: string[];
    subject?: string;
    message?: string;
  };
}

export interface ExportResult {
  fileName: string;
  filePath: string;
  format: ExportFormat;
  mimeType: string;
  size: number;
  stream?: Readable;
}

// Type guard for jsPDF with autotable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable?: {
    finalY: number;
  };
}

export class ExportService {
  private tempDir: string;

  constructor() {
    this.tempDir = join(tmpdir(), 'exports');
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      serverLogger.error('Failed to create temp directory', { error });
    }
  }

  private generateFileName(type: string, format: ExportFormat, customName?: string): string {
    if (customName) {
      return customName.endsWith(`.${format}`) ? customName : `${customName}.${format}`;
    }
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    return `${type}-export-${timestamp}.${format}`;
  }

  private getMimeType(format: ExportFormat): string {
    const mimeTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      json: 'application/json',
    };
    return mimeTypes[format];
  }

  // Jobs Export
  async exportJobs(options: ExportOptions): Promise<ExportResult> {
    try {
      let query = db.select().from(jobs);

      // Apply filters
      if (options.filters) {
        const conditions = [];
        if (options.filters.status) {
          conditions.push(eq(jobs.status, options.filters.status));
        }
        if (options.filters.builderId) {
          conditions.push(eq(jobs.builderId, options.filters.builderId));
        }
        if (options.dateRange) {
          conditions.push(
            and(
              gte(jobs.scheduledDate, options.dateRange.startDate),
              lte(jobs.scheduledDate, options.dateRange.endDate)
            )
          );
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      const data = await query;

      return this.formatData({
        data,
        type: 'jobs',
        format: options.format,
        columns: options.columns || ['id', 'name', 'status', 'address', 'scheduledDate', 'completedDate'],
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export jobs', { error });
      throw error;
    }
  }

  // Financial Data Export
  async exportFinancialData(options: ExportOptions & { dataType: 'invoices' | 'expenses' | 'mileage' }): Promise<ExportResult> {
    try {
      let data: any[] = [];
      let columns: string[] = [];

      switch (options.dataType) {
        case 'invoices':
          const invoiceQuery = db.select().from(invoices);
          if (options.dateRange) {
            invoiceQuery.where(
              and(
                gte(invoices.dueDate, options.dateRange.startDate),
                lte(invoices.dueDate, options.dateRange.endDate)
              )
            );
          }
          data = await invoiceQuery;
          columns = options.columns || ['id', 'invoiceNumber', 'clientName', 'amount', 'status', 'dueDate'];
          break;

        case 'expenses':
          const expenseQuery = db.select().from(expenses);
          if (options.dateRange) {
            expenseQuery.where(
              and(
                gte(expenses.date, options.dateRange.startDate),
                lte(expenses.date, options.dateRange.endDate)
              )
            );
          }
          data = await expenseQuery;
          columns = options.columns || ['id', 'category', 'description', 'amount', 'date', 'vendor'];
          break;

        case 'mileage':
          const mileageQuery = db.select().from(mileageLogs);
          if (options.dateRange) {
            mileageQuery.where(
              and(
                gte(mileageLogs.date, options.dateRange.startDate),
                lte(mileageLogs.date, options.dateRange.endDate)
              )
            );
          }
          data = await mileageQuery;
          columns = options.columns || ['id', 'date', 'startLocation', 'endLocation', 'distance', 'purpose'];
          break;
      }

      return this.formatData({
        data,
        type: options.dataType,
        format: options.format,
        columns,
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export financial data', { error, dataType: options.dataType });
      throw error;
    }
  }

  // Equipment Export
  async exportEquipment(options: ExportOptions): Promise<ExportResult> {
    try {
      const equipmentQuery = db.select({
        equipment: equipment,
        lastCalibration: sql`(
          SELECT MAX(calibration_date) 
          FROM ${equipmentCalibrations} 
          WHERE equipment_id = ${equipment.id}
        )`,
      }).from(equipment);

      const data = await equipmentQuery;

      const formattedData = data.map(row => ({
        ...row.equipment,
        lastCalibration: row.lastCalibration,
      }));

      return this.formatData({
        data: formattedData,
        type: 'equipment',
        format: options.format,
        columns: options.columns || ['id', 'name', 'type', 'serialNumber', 'status', 'calibrationDue', 'lastCalibration'],
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export equipment', { error });
      throw error;
    }
  }

  // QA Scores Export
  async exportQAScores(options: ExportOptions): Promise<ExportResult> {
    try {
      let query = db.select().from(qaInspectionScores);

      if (options.dateRange) {
        query = query.where(
          and(
            gte(qaInspectionScores.createdAt, options.dateRange.startDate),
            lte(qaInspectionScores.createdAt, options.dateRange.endDate)
          )
        );
      }

      const data = await query;

      return this.formatData({
        data,
        type: 'qa-scores',
        format: options.format,
        columns: options.columns || ['id', 'jobId', 'overallScore', 'category', 'findings', 'createdAt'],
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export QA scores', { error });
      throw error;
    }
  }

  // Analytics Export
  async exportAnalytics(options: ExportOptions & { reportType: string }): Promise<ExportResult> {
    try {
      // Gather analytics data based on report type
      let analyticsData: any = {};

      switch (options.reportType) {
        case 'performance':
          analyticsData = await this.gatherPerformanceMetrics(options.dateRange);
          break;
        case 'compliance':
          analyticsData = await this.gatherComplianceMetrics(options.dateRange);
          break;
        case 'financial':
          analyticsData = await this.gatherFinancialMetrics(options.dateRange);
          break;
        default:
          analyticsData = await this.gatherGeneralAnalytics(options.dateRange);
      }

      if (options.format === 'pdf') {
        return this.generateAnalyticsPDF(analyticsData, options.reportType);
      }

      return this.formatData({
        data: [analyticsData],
        type: `analytics-${options.reportType}`,
        format: options.format,
        columns: Object.keys(analyticsData),
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export analytics', { error });
      throw error;
    }
  }

  // Photo Metadata Export
  async exportPhotoMetadata(options: ExportOptions): Promise<ExportResult> {
    try {
      let query = db.select().from(photos);

      if (options.filters?.albumId) {
        query = query.where(eq(photos.albumId, options.filters.albumId));
      }

      if (options.dateRange) {
        query = query.where(
          and(
            gte(photos.uploadedAt, options.dateRange.startDate),
            lte(photos.uploadedAt, options.dateRange.endDate)
          )
        );
      }

      const data = await query;

      return this.formatData({
        data,
        type: 'photos',
        format: options.format,
        columns: options.columns || ['id', 'fileName', 'tags', 'albumId', 'uploadedAt', 'metadata'],
        customFileName: options.customFileName,
      });
    } catch (error) {
      serverLogger.error('Failed to export photo metadata', { error });
      throw error;
    }
  }

  // Format data based on export type
  private async formatData(params: {
    data: any[];
    type: string;
    format: ExportFormat;
    columns: string[];
    customFileName?: string;
  }): Promise<ExportResult> {
    const { data, type, format, columns, customFileName } = params;
    const fileName = this.generateFileName(type, format, customFileName);
    const filePath = join(this.tempDir, fileName);

    let fileContent: Buffer;

    switch (format) {
      case 'csv':
        fileContent = await this.generateCSV(data, columns);
        break;
      case 'xlsx':
        fileContent = await this.generateExcel(data, columns, type);
        break;
      case 'pdf':
        fileContent = await this.generatePDF(data, columns, type);
        break;
      case 'json':
        fileContent = Buffer.from(JSON.stringify(data, null, 2));
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fs.writeFile(filePath, fileContent);

    const stats = await fs.stat(filePath);

    return {
      fileName,
      filePath,
      format,
      mimeType: this.getMimeType(format),
      size: stats.size,
    };
  }

  // CSV Generation
  private async generateCSV(data: any[], columns: string[]): Promise<Buffer> {
    const csvData = data.map(row => {
      const csvRow: any = {};
      columns.forEach(col => {
        const value = row[col];
        csvRow[col] = value instanceof Date ? format(value, 'yyyy-MM-dd HH:mm:ss') : value;
      });
      return csvRow;
    });

    const csvString = stringify(csvData, {
      header: true,
      columns,
    });

    return Buffer.from(csvString);
  }

  // Excel Generation
  private async generateExcel(data: any[], columns: string[], sheetName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add header row with column definitions
    worksheet.columns = columns.map(col => ({
      header: col,
      key: col,
      width: 15
    }));

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    data.forEach(row => {
      const excelRow: any = {};
      columns.forEach(col => {
        const value = row[col];
        excelRow[col] = value instanceof Date ? format(value, 'yyyy-MM-dd HH:mm:ss') : value;
      });
      worksheet.addRow(excelRow);
    });

    // Write to buffer
    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  // PDF Generation
  private async generatePDF(data: any[], columns: string[], title: string): Promise<Buffer> {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Add title
    doc.setFontSize(16);
    doc.text(title.toUpperCase() + ' EXPORT', 14, 15);

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 14, 25);

    // Prepare table data
    const headers = columns.map(col => col.replace(/([A-Z])/g, ' $1').toUpperCase());
    const rows = data.map(row => {
      return columns.map(col => {
        const value = row[col];
        if (value instanceof Date) {
          return format(value, 'yyyy-MM-dd HH:mm');
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return String(value || '');
      });
    });

    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 35,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [46, 91, 186],
        textColor: 255,
        fontStyle: 'bold',
      },
    });

    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  // Analytics PDF Generation
  private async generateAnalyticsPDF(data: any, reportType: string): Promise<Buffer> {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Add title page
    doc.setFontSize(24);
    doc.text(`${reportType.toUpperCase()} ANALYTICS REPORT`, 105, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 105, 70, { align: 'center' });

    // Add summary section
    doc.addPage();
    doc.setFontSize(16);
    doc.text('EXECUTIVE SUMMARY', 14, 20);

    let yPosition = 35;
    doc.setFontSize(10);

    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle nested objects
        doc.setFontSize(12);
        doc.text(key.toUpperCase(), 14, yPosition);
        yPosition += 10;
        doc.setFontSize(10);

        Object.entries(value as any).forEach(([subKey, subValue]) => {
          doc.text(`  ${subKey}: ${subValue}`, 14, yPosition);
          yPosition += 7;
        });
      } else {
        doc.text(`${key}: ${value}`, 14, yPosition);
        yPosition += 7;
      }

      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  // Gather analytics metrics
  private async gatherPerformanceMetrics(dateRange?: { startDate: Date; endDate: Date }) {
    const conditions = dateRange
      ? and(
          gte(jobs.createdAt, dateRange.startDate),
          lte(jobs.createdAt, dateRange.endDate)
        )
      : undefined;

    const [jobMetrics, qaMetrics] = await Promise.all([
      db
        .select({
          totalJobs: sql<number>`count(*)`,
          completedJobs: sql<number>`count(case when status = 'completed' then 1 end)`,
          avgCompletionTime: sql<number>`avg(EXTRACT(EPOCH FROM (completed_date - scheduled_date))/86400)`,
        })
        .from(jobs)
        .where(conditions),
      db
        .select({
          avgScore: sql<number>`avg(overall_score)`,
          totalInspections: sql<number>`count(*)`,
        })
        .from(qaInspectionScores),
    ]);

    return {
      totalJobs: jobMetrics[0]?.totalJobs || 0,
      completedJobs: jobMetrics[0]?.completedJobs || 0,
      completionRate: ((jobMetrics[0]?.completedJobs || 0) / (jobMetrics[0]?.totalJobs || 1)) * 100,
      avgCompletionDays: jobMetrics[0]?.avgCompletionTime || 0,
      avgQAScore: qaMetrics[0]?.avgScore || 0,
      totalInspections: qaMetrics[0]?.totalInspections || 0,
    };
  }

  private async gatherComplianceMetrics(dateRange?: { startDate: Date; endDate: Date }) {
    const [checklistMetrics] = await Promise.all([
      db
        .select({
          totalItems: sql<number>`count(*)`,
          completedItems: sql<number>`count(case when completed = true then 1 end)`,
        })
        .from(checklistItems),
    ]);

    return {
      totalChecklistItems: checklistMetrics[0]?.totalItems || 0,
      completedChecklistItems: checklistMetrics[0]?.completedItems || 0,
      complianceRate: ((checklistMetrics[0]?.completedItems || 0) / (checklistMetrics[0]?.totalItems || 1)) * 100,
    };
  }

  private async gatherFinancialMetrics(dateRange?: { startDate: Date; endDate: Date }) {
    const conditions = dateRange
      ? and(
          gte(invoices.issueDate, dateRange.startDate),
          lte(invoices.issueDate, dateRange.endDate)
        )
      : undefined;

    const [invoiceMetrics, expenseMetrics] = await Promise.all([
      db
        .select({
          totalRevenue: sql<number>`sum(amount)`,
          totalInvoices: sql<number>`count(*)`,
          paidInvoices: sql<number>`count(case when status = 'paid' then 1 end)`,
        })
        .from(invoices)
        .where(conditions),
      db
        .select({
          totalExpenses: sql<number>`sum(amount)`,
          totalCount: sql<number>`count(*)`,
        })
        .from(expenses),
    ]);

    return {
      totalRevenue: invoiceMetrics[0]?.totalRevenue || 0,
      totalExpenses: expenseMetrics[0]?.totalExpenses || 0,
      netProfit: (invoiceMetrics[0]?.totalRevenue || 0) - (expenseMetrics[0]?.totalExpenses || 0),
      totalInvoices: invoiceMetrics[0]?.totalInvoices || 0,
      paidInvoices: invoiceMetrics[0]?.paidInvoices || 0,
      expenseCount: expenseMetrics[0]?.totalCount || 0,
    };
  }

  private async gatherGeneralAnalytics(dateRange?: { startDate: Date; endDate: Date }) {
    const [performance, compliance, financial] = await Promise.all([
      this.gatherPerformanceMetrics(dateRange),
      this.gatherComplianceMetrics(dateRange),
      this.gatherFinancialMetrics(dateRange),
    ]);

    return {
      performance,
      compliance,
      financial,
      generatedAt: new Date().toISOString(),
    };
  }

  // Cleanup old export files
  async cleanupOldExports(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = join(this.tempDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          serverLogger.info('Deleted old export file', { file });
        }
      }
    } catch (error) {
      serverLogger.error('Failed to cleanup old exports', { error });
    }
  }
}

export const exportService = new ExportService();