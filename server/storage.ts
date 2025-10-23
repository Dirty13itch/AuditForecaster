import {
  type User,
  type InsertUser,
  type Builder,
  type InsertBuilder,
  type Job,
  type InsertJob,
  type ScheduleEvent,
  type InsertScheduleEvent,
  type Expense,
  type InsertExpense,
  type MileageLog,
  type InsertMileageLog,
  type ReportTemplate,
  type InsertReportTemplate,
  type ReportInstance,
  type InsertReportInstance,
  type Photo,
  type InsertPhoto,
  type Forecast,
  type InsertForecast,
  type ChecklistItem,
  type InsertChecklistItem,
  type ComplianceRule,
  type InsertComplianceRule,
  type ComplianceHistory,
  type InsertComplianceHistory,
  type CalendarPreference,
  type InsertCalendarPreference,
  type GoogleEvent,
  type InsertGoogleEvent,
  type ScoreSummary,
} from "@shared/schema";
import { calculateScore } from "@shared/scoring";
import { randomUUID } from "crypto";
import { type PaginationParams, type PaginatedResult, type PhotoFilterParams } from "@shared/pagination";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createBuilder(builder: InsertBuilder): Promise<Builder>;
  getBuilder(id: string): Promise<Builder | undefined>;
  getAllBuilders(): Promise<Builder[]>;
  getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>>;
  updateBuilder(id: string, builder: Partial<InsertBuilder>): Promise<Builder | undefined>;
  deleteBuilder(id: string): Promise<boolean>;

  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  bulkDeleteJobs(ids: string[]): Promise<number>;

  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  getScheduleEvent(id: string): Promise<ScheduleEvent | undefined>;
  getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]>;
  getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]>;
  updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<boolean>;

  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>>;
  getExpensesByJob(jobId: string): Promise<Expense[]>;
  getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  getAllMileageLogs(): Promise<MileageLog[]>;
  getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>>;
  getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]>;
  updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog | undefined>;
  deleteMileageLog(id: string): Promise<boolean>;

  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getAllReportTemplates(): Promise<ReportTemplate[]>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<boolean>;

  createReportInstance(instance: InsertReportInstance): Promise<ReportInstance>;
  getReportInstance(id: string): Promise<ReportInstance | undefined>;
  getAllReportInstances(): Promise<ReportInstance[]>;
  getReportInstancesByJob(jobId: string): Promise<ReportInstance[]>;
  getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>>;
  updateReportInstance(id: string, instance: Partial<InsertReportInstance>): Promise<ReportInstance | undefined>;

  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getAllPhotos(): Promise<Photo[]>;
  getPhotosByJob(jobId: string): Promise<Photo[]>;
  getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]>;
  getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>>;
  updatePhoto(id: string, photo: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;
  
  // Bulk photo operations
  bulkDeletePhotos(ids: string[]): Promise<number>;
  bulkUpdatePhotoTags(ids: string[], mode: 'add' | 'remove' | 'replace', tags: string[]): Promise<number>;

  createForecast(forecast: InsertForecast): Promise<Forecast>;
  getForecast(id: string): Promise<Forecast | undefined>;
  getAllForecasts(): Promise<Forecast[]>;
  getForecastsByJob(jobId: string): Promise<Forecast[]>;
  updateForecast(id: string, forecast: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: string): Promise<boolean>;

  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  getChecklistItem(id: string): Promise<ChecklistItem | undefined>;
  getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]>;
  updateChecklistItem(id: string, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: string): Promise<boolean>;

  createComplianceRule(rule: InsertComplianceRule): Promise<ComplianceRule>;
  getComplianceRules(): Promise<ComplianceRule[]>;
  updateComplianceRule(id: string, rule: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined>;
  deleteComplianceRule(id: string): Promise<boolean>;

  getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]>;
  createComplianceHistoryEntry(entry: InsertComplianceHistory): Promise<ComplianceHistory>;

  // Calendar preferences
  getCalendarPreferences(): Promise<CalendarPreference[]>;
  saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]>;
  updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined>;
  deleteCalendarPreference(calendarId: string): Promise<boolean>;

  // Google events (not linked to jobs)
  createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent>;
  getGoogleEvent(id: string): Promise<GoogleEvent | undefined>;
  getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined>;
  getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]>;
  updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined>;
  deleteGoogleEvent(id: string): Promise<boolean>;
  markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined>;

  recalculateReportScore(reportInstanceId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private builders: Map<string, Builder>;
  private jobs: Map<string, Job>;
  private scheduleEvents: Map<string, ScheduleEvent>;
  private expenses: Map<string, Expense>;
  private mileageLogs: Map<string, MileageLog>;
  private reportTemplates: Map<string, ReportTemplate>;
  private reportInstances: Map<string, ReportInstance>;
  private photos: Map<string, Photo>;
  private forecasts: Map<string, Forecast>;
  private checklistItems: Map<string, ChecklistItem>;
  private complianceRules: Map<string, ComplianceRule>;
  private complianceHistory: Map<string, ComplianceHistory>;
  private calendarPreferences: Map<string, CalendarPreference>;
  private googleEvents: Map<string, GoogleEvent>;

  constructor() {
    this.users = new Map();
    this.builders = new Map();
    this.jobs = new Map();
    this.scheduleEvents = new Map();
    this.expenses = new Map();
    this.mileageLogs = new Map();
    this.reportTemplates = new Map();
    this.reportInstances = new Map();
    this.photos = new Map();
    this.forecasts = new Map();
    this.checklistItems = new Map();
    this.complianceRules = new Map();
    this.complianceHistory = new Map();
    this.calendarPreferences = new Map();
    this.googleEvents = new Map();

    this.initializeSampleData();
  }

  private initializeSampleData() {
    const builder1Id = randomUUID();
    const builder2Id = randomUUID();
    const builder3Id = randomUUID();

    const builder1: Builder = {
      id: builder1Id,
      name: "John Martinez",
      companyName: "M/I Homes",
      email: "john.martinez@mihomes.com",
      phone: "(614) 555-0101",
      address: "3250 Westerville Rd, Columbus, OH 43224",
      tradeSpecialization: "General Construction",
      rating: 5,
      totalJobs: 24,
      notes: "Primary contact for Columbus area developments",
    };

    const builder2: Builder = {
      id: builder2Id,
      name: "Sarah Chen",
      companyName: "M/I Homes",
      email: "sarah.chen@mihomes.com",
      phone: "(614) 555-0102",
      address: "3250 Westerville Rd, Columbus, OH 43224",
      tradeSpecialization: "Energy Compliance",
      rating: 5,
      totalJobs: 18,
      notes: "Specialist in HERS ratings and energy audits",
    };

    const builder3: Builder = {
      id: builder3Id,
      name: "Mike Thompson",
      companyName: "M/I Homes",
      email: "mike.thompson@mihomes.com",
      phone: "(614) 555-0103",
      address: "3250 Westerville Rd, Columbus, OH 43224",
      tradeSpecialization: "HVAC Systems",
      rating: 4,
      totalJobs: 15,
      notes: "Focus on mechanical system installations",
    };

    this.builders.set(builder1Id, builder1);
    this.builders.set(builder2Id, builder2);
    this.builders.set(builder3Id, builder3);

    const job1Id = randomUUID();
    const job2Id = randomUUID();
    const job3Id = randomUUID();

    const job1: Job = {
      id: job1Id,
      name: "Oakwood Village Lot 42",
      address: "4825 Oakwood Lane, Dublin, OH 43017",
      builderId: builder1Id,
      contractor: "M/I Homes - Columbus Division",
      status: "in-progress",
      inspectionType: "Thermal Bypass",
      scheduledDate: new Date("2025-10-25T09:00:00"),
      completedDate: null,
      completedItems: 28,
      totalItems: 52,
      priority: "high",
      latitude: 40.0992,
      longitude: -83.1141,
      notes: "HOA requires completion before November 1st",
      builderSignatureUrl: null,
      builderSignedAt: null,
      builderSignerName: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };

    const job2: Job = {
      id: job2Id,
      name: "Meadow Creek Lot 18",
      address: "1234 Meadow Creek Dr, Powell, OH 43065",
      builderId: builder2Id,
      contractor: "M/I Homes - Powell Division",
      status: "scheduled",
      inspectionType: "Final HERS Rating",
      scheduledDate: new Date("2025-10-28T14:00:00"),
      completedDate: null,
      completedItems: 0,
      totalItems: 52,
      priority: "medium",
      latitude: 40.1579,
      longitude: -83.0753,
      notes: "Builder requesting expedited turnaround",
      builderSignatureUrl: null,
      builderSignedAt: null,
      builderSignerName: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };

    const job3: Job = {
      id: job3Id,
      name: "Heritage Hills Lot 7",
      address: "987 Heritage Way, Westerville, OH 43081",
      builderId: builder1Id,
      contractor: "M/I Homes - Columbus Division",
      status: "completed",
      inspectionType: "Thermal Bypass",
      scheduledDate: new Date("2025-10-15T10:30:00"),
      completedDate: new Date("2025-10-15T14:45:00"),
      completedItems: 52,
      totalItems: 52,
      priority: "medium",
      latitude: 40.1261,
      longitude: -82.9291,
      notes: "All items passed - report sent to builder",
      builderSignatureUrl: null,
      builderSignedAt: null,
      builderSignerName: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };

    this.jobs.set(job1Id, job1);
    this.jobs.set(job2Id, job2);
    this.jobs.set(job3Id, job3);

    const expense1Id = randomUUID();
    const expense2Id = randomUUID();
    const expense3Id = randomUUID();

    const expense1: Expense = {
      id: expense1Id,
      jobId: job1Id,
      category: "Equipment",
      amount: "45.99",
      description: "Thermal imaging camera battery replacement",
      receiptUrl: null,
      date: new Date("2025-10-22T08:30:00"),
      isWorkRelated: true,
    };

    const expense2: Expense = {
      id: expense2Id,
      jobId: job3Id,
      category: "Fuel",
      amount: "38.50",
      description: "Gas for site visits - Columbus area",
      receiptUrl: null,
      date: new Date("2025-10-15T07:00:00"),
      isWorkRelated: true,
    };

    const expense3: Expense = {
      id: expense3Id,
      jobId: null,
      category: "Supplies",
      amount: "127.45",
      description: "Office supplies and inspection forms",
      receiptUrl: null,
      date: new Date("2025-10-18T12:00:00"),
      isWorkRelated: true,
    };

    this.expenses.set(expense1Id, expense1);
    this.expenses.set(expense2Id, expense2);
    this.expenses.set(expense3Id, expense3);

    const expense4Id = randomUUID();
    const expense5Id = randomUUID();
    const expense6Id = randomUUID();

    const expense4: Expense = {
      id: expense4Id,
      jobId: job2Id,
      category: "Meals",
      amount: "28.50",
      description: "Lunch meeting with builder - Powell location",
      receiptUrl: null,
      date: new Date("2025-10-21T12:30:00"),
      isWorkRelated: true,
    };

    const expense5: Expense = {
      id: expense5Id,
      jobId: null,
      category: "Equipment",
      amount: "89.99",
      description: "New thermal imaging lens",
      receiptUrl: null,
      date: new Date("2025-10-19T10:00:00"),
      isWorkRelated: true,
    };

    const expense6: Expense = {
      id: expense6Id,
      jobId: null,
      category: "Other",
      amount: "15.00",
      description: "Personal coffee",
      receiptUrl: null,
      date: new Date("2025-10-20T08:00:00"),
      isWorkRelated: false,
    };

    this.expenses.set(expense4Id, expense4);
    this.expenses.set(expense5Id, expense5);
    this.expenses.set(expense6Id, expense6);

    const mileage1Id = randomUUID();
    const mileage2Id = randomUUID();

    const mileage1: MileageLog = {
      id: mileage1Id,
      date: new Date("2025-10-22T08:00:00"),
      startLocation: "Home Office - 123 Main St, Columbus, OH",
      endLocation: "4825 Oakwood Lane, Dublin, OH 43017",
      distance: "18.5",
      purpose: "Thermal bypass inspection - Oakwood Village Lot 42",
      isWorkRelated: true,
      jobId: job1Id,
      startLatitude: 39.9612,
      startLongitude: -82.9988,
      endLatitude: 40.0992,
      endLongitude: -83.1141,
    };

    const mileage2: MileageLog = {
      id: mileage2Id,
      date: new Date("2025-10-15T09:00:00"),
      startLocation: "Home Office - 123 Main St, Columbus, OH",
      endLocation: "987 Heritage Way, Westerville, OH 43081",
      distance: "12.3",
      purpose: "Final inspection - Heritage Hills Lot 7",
      isWorkRelated: true,
      jobId: job3Id,
      startLatitude: 39.9612,
      startLongitude: -82.9988,
      endLatitude: 40.1261,
      endLongitude: -82.9291,
    };

    this.mileageLogs.set(mileage1Id, mileage1);
    this.mileageLogs.set(mileage2Id, mileage2);

    const mileage3Id = randomUUID();
    const mileage4Id = randomUUID();
    const mileage5Id = randomUUID();

    const mileage3: MileageLog = {
      id: mileage3Id,
      date: new Date("2025-10-23T14:00:00"),
      startLocation: "Home Office - 123 Main St, Columbus, OH",
      endLocation: "1234 Meadow Creek Dr, Powell, OH 43065",
      distance: "22.4",
      purpose: "Site visit for upcoming inspection",
      isWorkRelated: null,
      jobId: job2Id,
      startLatitude: 39.9612,
      startLongitude: -82.9988,
      endLatitude: 40.1579,
      endLongitude: -83.0753,
    };

    const mileage4: MileageLog = {
      id: mileage4Id,
      date: new Date("2025-10-21T16:30:00"),
      startLocation: "Downtown Columbus - 200 E Gay St",
      endLocation: "Home - 123 Main St, Columbus, OH",
      distance: "8.2",
      purpose: "Return home from errands",
      isWorkRelated: null,
      jobId: null,
      startLatitude: 39.9612,
      startLongitude: -83.0007,
      endLatitude: 39.9612,
      endLongitude: -82.9988,
    };

    const mileage5: MileageLog = {
      id: mileage5Id,
      date: new Date("2025-10-20T10:15:00"),
      startLocation: "Office Supply Store - Polaris",
      endLocation: "Home Office - 123 Main St, Columbus, OH",
      distance: "15.7",
      purpose: "Picked up inspection supplies",
      isWorkRelated: null,
      jobId: null,
      startLatitude: 40.1478,
      startLongitude: -82.9988,
      endLatitude: 39.9612,
      endLongitude: -82.9988,
    };

    this.mileageLogs.set(mileage3Id, mileage3);
    this.mileageLogs.set(mileage4Id, mileage4);
    this.mileageLogs.set(mileage5Id, mileage5);

    const template1Id = randomUUID();
    const template2Id = randomUUID();
    const template3Id = randomUUID();

    const template1: ReportTemplate = {
      id: template1Id,
      name: "Thermal Bypass Inspection Report",
      description: "Comprehensive pre-drywall thermal bypass inspection with checklist, photos, and forecast data",
      sections: JSON.stringify([
        { id: "1", title: "Overview", type: "Text", order: 1 },
        { id: "2", title: "Pre-Drywall Checklist", type: "Checklist", order: 2 },
        { id: "3", title: "Photos", type: "Photos", order: 3 },
        { id: "4", title: "Duct Leakage Forecast", type: "Forecast", order: 4 },
        { id: "5", title: "Final Notes", type: "Text", order: 5 },
        { id: "6", title: "Inspector Signature", type: "Signature", order: 6 },
      ]),
      isDefault: true,
      createdAt: new Date("2025-01-15T10:00:00"),
    };

    const template2: ReportTemplate = {
      id: template2Id,
      name: "Quick Inspection Summary",
      description: "Simplified inspection report for quick turnaround",
      sections: JSON.stringify([
        { id: "1", title: "Summary", type: "Text", order: 1 },
        { id: "2", title: "Key Findings", type: "Checklist", order: 2 },
        { id: "3", title: "Photos", type: "Photos", order: 3 },
      ]),
      isDefault: false,
      createdAt: new Date("2025-02-10T14:30:00"),
    };

    const template3: ReportTemplate = {
      id: template3Id,
      name: "Conditional Inspection Form",
      description: "Smart inspection form with conditional logic that shows/hides fields based on your answers",
      sections: JSON.stringify([
        {
          id: "section1",
          title: "Property Information",
          description: "Basic property details and inspection scope",
          fields: [
            {
              id: "propertyAddress",
              label: "Property Address",
              type: "text",
              required: true,
            },
            {
              id: "inspectorName",
              label: "Inspector Name",
              type: "text",
              required: true,
            },
            {
              id: "inspectionDate",
              label: "Inspection Date",
              type: "date",
              required: true,
            },
          ],
        },
        {
          id: "section2",
          title: "Structural Assessment",
          description: "Basement and foundation inspection",
          fields: [
            {
              id: "hasBasement",
              label: "Is there a basement?",
              type: "radio",
              required: true,
              options: ["Yes", "No"],
            },
            {
              id: "basementCondition",
              label: "Basement Condition",
              type: "select",
              required: true,
              options: ["Excellent", "Good", "Fair", "Poor"],
              conditions: [
                {
                  fieldId: "hasBasement",
                  operator: "equals",
                  value: "Yes",
                },
              ],
            },
            {
              id: "basementMoistureIssues",
              label: "Moisture or Water Intrusion Issues",
              type: "radio",
              required: false,
              options: ["Yes", "No"],
              conditions: [
                {
                  fieldId: "hasBasement",
                  operator: "equals",
                  value: "Yes",
                },
              ],
            },
            {
              id: "basementNotes",
              label: "Basement Notes",
              type: "textarea",
              required: false,
              conditions: [
                {
                  fieldId: "hasBasement",
                  operator: "equals",
                  value: "Yes",
                },
              ],
            },
          ],
        },
        {
          id: "section3",
          title: "HVAC System",
          description: "Heating, ventilation, and air conditioning inspection",
          fields: [
            {
              id: "ductLeakageTest",
              label: "Duct Leakage Test Result",
              type: "select",
              required: true,
              options: ["Pass", "Fail", "Not Tested"],
            },
            {
              id: "ductLeakageValue",
              label: "Duct Leakage CFM25",
              type: "number",
              required: false,
            },
            {
              id: "remediationRequired",
              label: "Remediation Required",
              type: "textarea",
              required: true,
              conditions: [
                {
                  fieldId: "ductLeakageTest",
                  operator: "equals",
                  value: "Fail",
                },
              ],
            },
            {
              id: "followUpDate",
              label: "Follow-up Inspection Date",
              type: "date",
              required: true,
              conditions: [
                {
                  fieldId: "ductLeakageTest",
                  operator: "equals",
                  value: "Fail",
                },
              ],
            },
          ],
        },
        {
          id: "section4",
          title: "Insulation",
          description: "Insulation type and specifications",
          fields: [
            {
              id: "insulationType",
              label: "Insulation Type",
              type: "select",
              required: true,
              options: ["Fiberglass", "Spray Foam", "Cellulose", "Other"],
            },
            {
              id: "rValue",
              label: "R-Value",
              type: "number",
              required: true,
              conditions: [
                {
                  fieldId: "insulationType",
                  operator: "equals",
                  value: "Fiberglass",
                },
              ],
            },
            {
              id: "sprayFoamType",
              label: "Spray Foam Type",
              type: "radio",
              required: true,
              options: ["Open Cell", "Closed Cell"],
              conditions: [
                {
                  fieldId: "insulationType",
                  operator: "equals",
                  value: "Spray Foam",
                },
              ],
            },
            {
              id: "sprayFoamThickness",
              label: "Spray Foam Thickness (inches)",
              type: "number",
              required: false,
              conditions: [
                {
                  fieldId: "insulationType",
                  operator: "equals",
                  value: "Spray Foam",
                },
              ],
            },
            {
              id: "celluloseDepth",
              label: "Cellulose Depth (inches)",
              type: "number",
              required: true,
              conditions: [
                {
                  fieldId: "insulationType",
                  operator: "equals",
                  value: "Cellulose",
                },
              ],
            },
            {
              id: "otherInsulationDescription",
              label: "Other Insulation Description",
              type: "textarea",
              required: true,
              conditions: [
                {
                  fieldId: "insulationType",
                  operator: "equals",
                  value: "Other",
                },
              ],
            },
          ],
        },
        {
          id: "section5",
          title: "Final Notes",
          description: "Additional observations and recommendations",
          fields: [
            {
              id: "overallCondition",
              label: "Overall Condition Rating",
              type: "select",
              required: true,
              options: ["Excellent", "Good", "Fair", "Poor"],
            },
            {
              id: "additionalNotes",
              label: "Additional Notes",
              type: "textarea",
              required: false,
            },
            {
              id: "requiresFollowUp",
              label: "Requires Follow-up Inspection",
              type: "checkbox",
              required: false,
            },
          ],
        },
      ]),
      isDefault: false,
      createdAt: new Date("2025-03-20T09:00:00"),
    };

    this.reportTemplates.set(template1Id, template1);
    this.reportTemplates.set(template2Id, template2);
    this.reportTemplates.set(template3Id, template3);

    const reportInstance1Id = randomUUID();
    const reportInstance2Id = randomUUID();

    const reportInstance1: ReportInstance = {
      id: reportInstance1Id,
      jobId: job3Id,
      templateId: template1Id,
      data: JSON.stringify({
        overview: "Thermal bypass inspection completed on Heritage Hills Lot 7. All 52 items inspected and passed.",
        checklistSummary: "52/52 items completed",
        forecast: {
          predictedTDL: "125.0",
          predictedDLO: "8.5",
          actualTDL: "118.2",
          actualDLO: "7.9",
        },
        finalNotes: "Excellent workmanship throughout. No corrective actions required. Ready for drywall installation.",
        inspector: "John Doe, HERS Rater",
      }),
      pdfUrl: null,
      emailedTo: "john.martinez@mihomes.com",
      emailedAt: new Date("2025-10-15T15:30:00"),
      createdAt: new Date("2025-10-15T15:00:00"),
      scoreSummary: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };

    const reportInstance2: ReportInstance = {
      id: reportInstance2Id,
      jobId: job1Id,
      templateId: template1Id,
      data: JSON.stringify({
        overview: "Thermal bypass inspection in progress for Oakwood Village Lot 42. Currently 28 of 52 items completed.",
        checklistSummary: "28/52 items completed",
        forecast: {
          predictedTDL: "130.0",
          predictedDLO: "9.2",
        },
        finalNotes: "Inspection ongoing. Will complete remaining items during next site visit.",
        inspector: "John Doe, HERS Rater",
      }),
      pdfUrl: null,
      emailedTo: null,
      emailedAt: null,
      createdAt: new Date("2025-10-22T11:00:00"),
      scoreSummary: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };

    this.reportInstances.set(reportInstance1Id, reportInstance1);
    this.reportInstances.set(reportInstance2Id, reportInstance2);

    const scheduleEvent1Id = randomUUID();
    const scheduleEvent2Id = randomUUID();
    const scheduleEvent3Id = randomUUID();

    const scheduleEvent1: ScheduleEvent = {
      id: scheduleEvent1Id,
      jobId: job1Id,
      title: "Oakwood Village Lot 42",
      startTime: new Date("2025-10-25T09:00:00"),
      endTime: new Date("2025-10-25T12:00:00"),
      notes: null,
      googleCalendarEventId: null,
      lastSyncedAt: null,
      color: null,
    };

    const scheduleEvent2: ScheduleEvent = {
      id: scheduleEvent2Id,
      jobId: job2Id,
      title: "Meadow Creek Lot 18",
      startTime: new Date("2025-10-28T14:00:00"),
      endTime: new Date("2025-10-28T16:00:00"),
      notes: null,
      googleCalendarEventId: null,
      lastSyncedAt: null,
      color: null,
    };

    const scheduleEvent3: ScheduleEvent = {
      id: scheduleEvent3Id,
      jobId: job3Id,
      title: "Heritage Hills Lot 7",
      startTime: new Date("2025-10-15T10:30:00"),
      endTime: new Date("2025-10-15T14:45:00"),
      notes: null,
      googleCalendarEventId: null,
      lastSyncedAt: null,
      color: null,
    };

    this.scheduleEvents.set(scheduleEvent1Id, scheduleEvent1);
    this.scheduleEvents.set(scheduleEvent2Id, scheduleEvent2);
    this.scheduleEvents.set(scheduleEvent3Id, scheduleEvent3);

    const checklistItem1Id = randomUUID();
    const checklistItem2Id = randomUUID();
    const checklistItem3Id = randomUUID();
    const checklistItem4Id = randomUUID();
    const checklistItem5Id = randomUUID();

    const checklistItem1: ChecklistItem = {
      id: checklistItem1Id,
      jobId: job1Id,
      itemNumber: 1,
      title: "Exterior walls air sealed",
      completed: true,
      status: "passed",
      notes: "All penetrations sealed with foam",
      photoCount: 2,
      photoRequired: true,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    };

    const checklistItem2: ChecklistItem = {
      id: checklistItem2Id,
      jobId: job1Id,
      itemNumber: 2,
      title: "Attic access insulated and sealed",
      completed: false,
      status: "pending",
      notes: null,
      photoCount: 0,
      photoRequired: true,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    };

    const checklistItem3: ChecklistItem = {
      id: checklistItem3Id,
      jobId: job1Id,
      itemNumber: 3,
      title: "HVAC ducts sealed at register boots",
      completed: true,
      status: "passed",
      notes: "Mastic applied to all connections",
      photoCount: 3,
      photoRequired: true,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    };

    const checklistItem4: ChecklistItem = {
      id: checklistItem4Id,
      jobId: job1Id,
      itemNumber: 4,
      title: "Recessed lighting IC rated and sealed",
      completed: false,
      status: "not_applicable",
      notes: null,
      photoCount: 0,
      photoRequired: false,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    };

    const checklistItem5: ChecklistItem = {
      id: checklistItem5Id,
      jobId: job1Id,
      itemNumber: 5,
      title: "Plumbing penetrations air sealed",
      completed: false,
      status: "failed",
      notes: null,
      photoCount: 1,
      photoRequired: true,
      voiceNoteUrl: null,
      voiceNoteDuration: null,
    };

    this.checklistItems.set(checklistItem1Id, checklistItem1);
    this.checklistItems.set(checklistItem2Id, checklistItem2);
    this.checklistItems.set(checklistItem3Id, checklistItem3);
    this.checklistItems.set(checklistItem4Id, checklistItem4);
    this.checklistItems.set(checklistItem5Id, checklistItem5);

    const complianceRule1Id = randomUUID();
    const complianceRule2Id = randomUUID();
    const complianceRule3Id = randomUUID();

    const complianceRule1: ComplianceRule = {
      id: complianceRule1Id,
      userId: null,
      codeYear: "2023 MN",
      metricType: "TDL",
      threshold: "4.00",
      units: "CFM/100 sq ft",
      severity: "critical",
      isActive: true,
      description: "Total Duct Leakage must be 4 CFM/100 sq ft or less per Minnesota energy code",
      createdAt: new Date(),
    };

    const complianceRule2: ComplianceRule = {
      id: complianceRule2Id,
      userId: null,
      codeYear: "2023 MN",
      metricType: "DLO",
      threshold: "6.00",
      units: "CFM/100 sq ft",
      severity: "critical",
      isActive: true,
      description: "Duct Leakage to Outside must be 6 CFM/100 sq ft or less per Minnesota energy code",
      createdAt: new Date(),
    };

    const complianceRule3: ComplianceRule = {
      id: complianceRule3Id,
      userId: null,
      codeYear: "2023 MN",
      metricType: "ACH50",
      threshold: "5.00",
      units: "ACH",
      severity: "major",
      isActive: true,
      description: "Air Changes per Hour at 50 Pascals should be 5.0 or less for optimal energy efficiency",
      createdAt: new Date(),
    };

    this.complianceRules.set(complianceRule1Id, complianceRule1);
    this.complianceRules.set(complianceRule2Id, complianceRule2);
    this.complianceRules.set(complianceRule3Id, complianceRule3);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBuilder(insertBuilder: InsertBuilder): Promise<Builder> {
    const id = randomUUID();
    const builder: Builder = {
      id,
      name: insertBuilder.name,
      companyName: insertBuilder.companyName,
      email: insertBuilder.email ?? null,
      phone: insertBuilder.phone ?? null,
      address: insertBuilder.address ?? null,
      tradeSpecialization: insertBuilder.tradeSpecialization ?? null,
      rating: insertBuilder.rating ?? null,
      notes: insertBuilder.notes ?? null,
      totalJobs: 0,
    };
    this.builders.set(id, builder);
    return builder;
  }

  async getBuilder(id: string): Promise<Builder | undefined> {
    return this.builders.get(id);
  }

  async getAllBuilders(): Promise<Builder[]> {
    return Array.from(this.builders.values());
  }

  async getBuildersPaginated(params: PaginationParams): Promise<PaginatedResult<Builder>> {
    const { limit, offset } = params;
    const total = this.builders.size;
    
    const data: Builder[] = [];
    let currentIndex = 0;
    
    for (const builder of this.builders.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(builder);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateBuilder(id: string, updates: Partial<InsertBuilder>): Promise<Builder | undefined> {
    const builder = this.builders.get(id);
    if (!builder) return undefined;
    const updated = { ...builder, ...updates };
    this.builders.set(id, updated);
    return updated;
  }

  async deleteBuilder(id: string): Promise<boolean> {
    return this.builders.delete(id);
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = randomUUID();
    const job: Job = {
      id,
      name: insertJob.name,
      address: insertJob.address,
      builderId: insertJob.builderId ?? null,
      contractor: insertJob.contractor,
      status: insertJob.status,
      inspectionType: insertJob.inspectionType,
      scheduledDate: insertJob.scheduledDate ?? null,
      completedDate: insertJob.completedDate ?? null,
      completedItems: insertJob.completedItems ?? null,
      totalItems: insertJob.totalItems ?? null,
      priority: insertJob.priority ?? null,
      latitude: insertJob.latitude ?? null,
      longitude: insertJob.longitude ?? null,
      notes: insertJob.notes ?? null,
      builderSignatureUrl: insertJob.builderSignatureUrl ?? null,
      builderSignedAt: insertJob.builderSignedAt ?? null,
      builderSignerName: insertJob.builderSignerName ?? null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  async getJobsPaginated(params: PaginationParams): Promise<PaginatedResult<Job>> {
    const { limit, offset } = params;
    const total = this.jobs.size;
    
    const data: Job[] = [];
    let currentIndex = 0;
    
    for (const job of this.jobs.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(job);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async bulkDeleteJobs(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.jobs.delete(id)) {
        deleted++;
      }
    }
    return deleted;
  }

  async createScheduleEvent(insertEvent: InsertScheduleEvent): Promise<ScheduleEvent> {
    const id = randomUUID();
    const event: ScheduleEvent = {
      id,
      jobId: insertEvent.jobId,
      title: insertEvent.title,
      startTime: insertEvent.startTime,
      endTime: insertEvent.endTime,
      notes: insertEvent.notes ?? null,
      googleCalendarEventId: insertEvent.googleCalendarEventId ?? null,
      lastSyncedAt: insertEvent.lastSyncedAt ?? null,
      color: insertEvent.color ?? null,
    };
    this.scheduleEvents.set(id, event);
    return event;
  }

  async getScheduleEvent(id: string): Promise<ScheduleEvent | undefined> {
    return this.scheduleEvents.get(id);
  }

  async getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]> {
    return Array.from(this.scheduleEvents.values()).filter(
      (event) => event.jobId === jobId,
    );
  }

  async getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]> {
    return Array.from(this.scheduleEvents.values()).filter(
      (event) => event.startTime >= startDate && event.startTime <= endDate,
    );
  }

  async updateScheduleEvent(id: string, updates: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined> {
    const event = this.scheduleEvents.get(id);
    if (!event) return undefined;
    const updated = { ...event, ...updates };
    this.scheduleEvents.set(id, updated);
    return updated;
  }

  async deleteScheduleEvent(id: string): Promise<boolean> {
    return this.scheduleEvents.delete(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = {
      id,
      jobId: insertExpense.jobId ?? null,
      category: insertExpense.category,
      amount: insertExpense.amount,
      description: insertExpense.description ?? null,
      receiptUrl: insertExpense.receiptUrl ?? null,
      date: insertExpense.date,
      isWorkRelated: insertExpense.isWorkRelated ?? null,
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async getAllExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }

  async getExpensesPaginated(params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    const total = this.expenses.size;
    
    const data: Expense[] = [];
    let currentIndex = 0;
    
    for (const expense of this.expenses.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(expense);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getExpensesByJob(jobId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.jobId === jobId,
    );
  }

  async getExpensesByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Expense>> {
    const { limit, offset } = params;
    
    let total = 0;
    for (const expense of this.expenses.values()) {
      if (expense.jobId === jobId) {
        total++;
      }
    }
    
    const data: Expense[] = [];
    let matchedIndex = 0;
    
    for (const expense of this.expenses.values()) {
      if (expense.jobId === jobId) {
        if (matchedIndex >= offset && data.length < limit) {
          data.push(expense);
        }
        matchedIndex++;
        
        if (data.length === limit) {
          break;
        }
      }
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    const updated = { ...expense, ...updates };
    this.expenses.set(id, updated);
    return updated;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  async bulkDeleteExpenses(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.expenses.delete(id)) {
        deleted++;
      }
    }
    return deleted;
  }

  async createMileageLog(insertLog: InsertMileageLog): Promise<MileageLog> {
    const id = randomUUID();
    const log: MileageLog = {
      id,
      date: insertLog.date,
      startLocation: insertLog.startLocation ?? null,
      endLocation: insertLog.endLocation ?? null,
      distance: insertLog.distance,
      purpose: insertLog.purpose ?? null,
      isWorkRelated: insertLog.isWorkRelated ?? null,
      jobId: insertLog.jobId ?? null,
      startLatitude: insertLog.startLatitude ?? null,
      startLongitude: insertLog.startLongitude ?? null,
      endLatitude: insertLog.endLatitude ?? null,
      endLongitude: insertLog.endLongitude ?? null,
    };
    this.mileageLogs.set(id, log);
    return log;
  }

  async getMileageLog(id: string): Promise<MileageLog | undefined> {
    return this.mileageLogs.get(id);
  }

  async getAllMileageLogs(): Promise<MileageLog[]> {
    return Array.from(this.mileageLogs.values());
  }

  async getMileageLogsPaginated(params: PaginationParams): Promise<PaginatedResult<MileageLog>> {
    const { limit, offset } = params;
    const total = this.mileageLogs.size;
    
    const data: MileageLog[] = [];
    let currentIndex = 0;
    
    for (const log of this.mileageLogs.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(log);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getMileageLogsByDateRange(startDate: Date, endDate: Date): Promise<MileageLog[]> {
    return Array.from(this.mileageLogs.values()).filter(
      (log) => log.date >= startDate && log.date <= endDate,
    );
  }

  async updateMileageLog(id: string, updates: Partial<InsertMileageLog>): Promise<MileageLog | undefined> {
    const log = this.mileageLogs.get(id);
    if (!log) return undefined;
    const updated = { ...log, ...updates };
    this.mileageLogs.set(id, updated);
    return updated;
  }

  async deleteMileageLog(id: string): Promise<boolean> {
    return this.mileageLogs.delete(id);
  }

  async createReportTemplate(insertTemplate: InsertReportTemplate): Promise<ReportTemplate> {
    const id = randomUUID();
    const template: ReportTemplate = {
      id,
      name: insertTemplate.name,
      description: insertTemplate.description ?? null,
      sections: insertTemplate.sections,
      isDefault: insertTemplate.isDefault ?? null,
      createdAt: new Date(),
    };
    this.reportTemplates.set(id, template);
    return template;
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    return this.reportTemplates.get(id);
  }

  async getAllReportTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.reportTemplates.values());
  }

  async updateReportTemplate(id: string, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    const template = this.reportTemplates.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...updates };
    this.reportTemplates.set(id, updated);
    return updated;
  }

  async deleteReportTemplate(id: string): Promise<boolean> {
    return this.reportTemplates.delete(id);
  }

  async createReportInstance(insertInstance: InsertReportInstance): Promise<ReportInstance> {
    const id = randomUUID();
    const instance: ReportInstance = {
      id,
      jobId: insertInstance.jobId,
      templateId: insertInstance.templateId,
      data: insertInstance.data,
      pdfUrl: insertInstance.pdfUrl ?? null,
      emailedTo: insertInstance.emailedTo ?? null,
      emailedAt: insertInstance.emailedAt ?? null,
      createdAt: new Date(),
      scoreSummary: null,
      complianceStatus: null,
      complianceFlags: null,
      lastComplianceCheck: null,
    };
    this.reportInstances.set(id, instance);

    await this.recalculateReportScore(id);

    return instance;
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    return this.reportInstances.get(id);
  }

  async getAllReportInstances(): Promise<ReportInstance[]> {
    return Array.from(this.reportInstances.values());
  }

  async getReportInstancesByJob(jobId: string): Promise<ReportInstance[]> {
    return Array.from(this.reportInstances.values()).filter(
      (instance) => instance.jobId === jobId,
    );
  }

  async getReportInstancesPaginated(params: PaginationParams): Promise<PaginatedResult<ReportInstance>> {
    const { limit, offset } = params;
    const total = this.reportInstances.size;
    
    const data: ReportInstance[] = [];
    let currentIndex = 0;
    
    for (const instance of this.reportInstances.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(instance);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updateReportInstance(id: string, updates: Partial<InsertReportInstance>): Promise<ReportInstance | undefined> {
    const instance = this.reportInstances.get(id);
    if (!instance) return undefined;
    const updated = { ...instance, ...updates };
    this.reportInstances.set(id, updated);
    return updated;
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = randomUUID();
    const fullUrl = insertPhoto.fullUrl || insertPhoto.filePath;
    const photo: Photo = {
      id,
      jobId: insertPhoto.jobId,
      checklistItemId: insertPhoto.checklistItemId ?? null,
      filePath: insertPhoto.filePath,
      fullUrl: fullUrl ?? null,
      hash: insertPhoto.hash ?? null,
      caption: insertPhoto.caption ?? null,
      tags: insertPhoto.tags ?? null,
      annotationData: insertPhoto.annotationData ?? null,
      uploadedAt: new Date(),
    };
    this.photos.set(id, photo);
    return photo;
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async getAllPhotos(): Promise<Photo[]> {
    return Array.from(this.photos.values());
  }

  async getPhotosByJob(jobId: string): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(
      (photo) => photo.jobId === jobId,
    );
  }

  async getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(
      (photo) => photo.checklistItemId === checklistItemId,
    );
  }

  async getPhotosPaginated(params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    const total = this.photos.size;
    
    const data: Photo[] = [];
    let currentIndex = 0;
    
    for (const photo of this.photos.values()) {
      if (currentIndex < offset) {
        currentIndex++;
        continue;
      }
      
      if (data.length < limit) {
        data.push(photo);
      } else {
        break;
      }
      
      currentIndex++;
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByJobPaginated(jobId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    let total = 0;
    for (const photo of this.photos.values()) {
      if (photo.jobId === jobId) {
        total++;
      }
    }
    
    const data: Photo[] = [];
    let matchedIndex = 0;
    
    for (const photo of this.photos.values()) {
      if (photo.jobId === jobId) {
        if (matchedIndex >= offset && data.length < limit) {
          data.push(photo);
        }
        matchedIndex++;
        
        if (data.length === limit) {
          break;
        }
      }
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosByChecklistItemPaginated(checklistItemId: string, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    
    let total = 0;
    for (const photo of this.photos.values()) {
      if (photo.checklistItemId === checklistItemId) {
        total++;
      }
    }
    
    const data: Photo[] = [];
    let matchedIndex = 0;
    
    for (const photo of this.photos.values()) {
      if (photo.checklistItemId === checklistItemId) {
        if (matchedIndex >= offset && data.length < limit) {
          data.push(photo);
        }
        matchedIndex++;
        
        if (data.length === limit) {
          break;
        }
      }
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getPhotosFilteredPaginated(filters: PhotoFilterParams, params: PaginationParams): Promise<PaginatedResult<Photo>> {
    const { limit, offset } = params;
    const { jobId, checklistItemId, tags, dateFrom, dateTo } = filters;
    
    // Helper function to check if photo matches all filters
    const matchesFilters = (photo: Photo): boolean => {
      // Job filter
      if (jobId && photo.jobId !== jobId) {
        return false;
      }
      
      // Checklist item filter
      if (checklistItemId && photo.checklistItemId !== checklistItemId) {
        return false;
      }
      
      // Tags filter - photo must have ALL specified tags (AND logic)
      if (tags && tags.length > 0) {
        const photoTags = photo.tags ?? [];
        const hasAllTags = tags.every(tag => photoTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }
      
      // Date range filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (new Date(photo.uploadedAt) < fromDate) {
          return false;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (new Date(photo.uploadedAt) > toDate) {
          return false;
        }
      }
      
      return true;
    };
    
    // Count total matching photos
    let total = 0;
    for (const photo of this.photos.values()) {
      if (matchesFilters(photo)) {
        total++;
      }
    }
    
    // Get paginated data
    const data: Photo[] = [];
    let matchedIndex = 0;
    
    for (const photo of this.photos.values()) {
      if (matchesFilters(photo)) {
        if (matchedIndex >= offset && data.length < limit) {
          data.push(photo);
        }
        matchedIndex++;
        
        if (data.length === limit) {
          break;
        }
      }
    }
    
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async updatePhoto(id: string, updates: Partial<InsertPhoto>): Promise<Photo | undefined> {
    const photo = this.photos.get(id);
    if (!photo) {
      return undefined;
    }
    const updated: Photo = { ...photo, ...updates };
    this.photos.set(id, updated);
    return updated;
  }

  async deletePhoto(id: string): Promise<boolean> {
    return this.photos.delete(id);
  }

  async bulkDeletePhotos(ids: string[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      if (this.photos.delete(id)) {
        deleted++;
      }
    }
    return deleted;
  }

  async bulkUpdatePhotoTags(
    ids: string[],
    mode: 'add' | 'remove' | 'replace',
    tags: string[]
  ): Promise<number> {
    let updated = 0;
    
    for (const id of ids) {
      const photo = this.photos.get(id);
      if (!photo) continue;

      let newTags: string[];
      const currentTags = photo.tags || [];

      switch (mode) {
        case 'add':
          // Add tags (avoid duplicates)
          newTags = Array.from(new Set([...currentTags, ...tags]));
          break;
        case 'remove':
          // Remove tags
          newTags = currentTags.filter(tag => !tags.includes(tag));
          break;
        case 'replace':
          // Replace all tags
          newTags = [...tags];
          break;
      }

      const updatedPhoto: Photo = { ...photo, tags: newTags };
      this.photos.set(id, updatedPhoto);
      updated++;
    }

    return updated;
  }

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const id = randomUUID();
    const forecast: Forecast = {
      id,
      jobId: insertForecast.jobId,
      predictedTDL: insertForecast.predictedTDL ?? null,
      predictedDLO: insertForecast.predictedDLO ?? null,
      predictedACH50: insertForecast.predictedACH50 ?? null,
      actualTDL: insertForecast.actualTDL ?? null,
      actualDLO: insertForecast.actualDLO ?? null,
      actualACH50: insertForecast.actualACH50 ?? null,
      confidence: insertForecast.confidence ?? null,
    };
    this.forecasts.set(id, forecast);
    return forecast;
  }

  async getForecast(id: string): Promise<Forecast | undefined> {
    return this.forecasts.get(id);
  }

  async getAllForecasts(): Promise<Forecast[]> {
    return Array.from(this.forecasts.values());
  }

  async getForecastsByJob(jobId: string): Promise<Forecast[]> {
    return Array.from(this.forecasts.values()).filter(
      (forecast) => forecast.jobId === jobId,
    );
  }

  async updateForecast(id: string, updates: Partial<InsertForecast>): Promise<Forecast | undefined> {
    const forecast = this.forecasts.get(id);
    if (!forecast) return undefined;
    const updated = { ...forecast, ...updates };
    this.forecasts.set(id, updated);
    return updated;
  }

  async deleteForecast(id: string): Promise<boolean> {
    return this.forecasts.delete(id);
  }

  async createChecklistItem(insertItem: InsertChecklistItem): Promise<ChecklistItem> {
    const id = randomUUID();
    const item: ChecklistItem = {
      id,
      jobId: insertItem.jobId,
      itemNumber: insertItem.itemNumber,
      title: insertItem.title,
      completed: insertItem.completed ?? false,
      status: insertItem.status ?? 'pending',
      notes: insertItem.notes ?? null,
      photoCount: insertItem.photoCount ?? 0,
      photoRequired: insertItem.photoRequired ?? false,
      voiceNoteUrl: insertItem.voiceNoteUrl ?? null,
      voiceNoteDuration: insertItem.voiceNoteDuration ?? null,
    };
    this.checklistItems.set(id, item);

    const instances = await this.getReportInstancesByJob(insertItem.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return item;
  }

  async getChecklistItem(id: string): Promise<ChecklistItem | undefined> {
    return this.checklistItems.get(id);
  }

  async getChecklistItemsByJob(jobId: string): Promise<ChecklistItem[]> {
    return Array.from(this.checklistItems.values())
      .filter((item) => item.jobId === jobId)
      .sort((a, b) => a.itemNumber - b.itemNumber);
  }

  async updateChecklistItem(id: string, updates: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined> {
    const item = this.checklistItems.get(id);
    if (!item) return undefined;
    const updated = { ...item, ...updates };
    this.checklistItems.set(id, updated);

    const instances = await this.getReportInstancesByJob(updated.jobId);
    for (const instance of instances) {
      await this.recalculateReportScore(instance.id);
    }

    return updated;
  }

  async deleteChecklistItem(id: string): Promise<boolean> {
    return this.checklistItems.delete(id);
  }

  async createComplianceRule(insertRule: InsertComplianceRule): Promise<ComplianceRule> {
    const id = randomUUID();
    const rule: ComplianceRule = {
      id,
      userId: insertRule.userId ?? null,
      codeYear: insertRule.codeYear,
      metricType: insertRule.metricType,
      threshold: insertRule.threshold,
      units: insertRule.units,
      severity: insertRule.severity,
      isActive: insertRule.isActive ?? true,
      description: insertRule.description ?? null,
      createdAt: new Date(),
    };
    this.complianceRules.set(id, rule);
    return rule;
  }

  async getComplianceRules(): Promise<ComplianceRule[]> {
    return Array.from(this.complianceRules.values()).filter(
      (rule) => rule.isActive,
    );
  }

  async updateComplianceRule(id: string, updates: Partial<InsertComplianceRule>): Promise<ComplianceRule | undefined> {
    const rule = this.complianceRules.get(id);
    if (!rule) return undefined;
    const updated = { ...rule, ...updates };
    this.complianceRules.set(id, updated);
    return updated;
  }

  async deleteComplianceRule(id: string): Promise<boolean> {
    return this.complianceRules.delete(id);
  }

  async getComplianceHistory(entityType?: string, entityId?: string): Promise<ComplianceHistory[]> {
    let history = Array.from(this.complianceHistory.values());
    
    if (entityType) {
      history = history.filter((h) => h.entityType === entityType);
    }
    
    if (entityId) {
      history = history.filter((h) => h.entityId === entityId);
    }
    
    return history.sort((a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime());
  }

  async createComplianceHistoryEntry(insertEntry: InsertComplianceHistory): Promise<ComplianceHistory> {
    const id = randomUUID();
    const entry: ComplianceHistory = {
      id,
      entityType: insertEntry.entityType,
      entityId: insertEntry.entityId,
      evaluatedAt: insertEntry.evaluatedAt ?? new Date(),
      status: insertEntry.status,
      violations: insertEntry.violations ?? null,
      ruleSnapshot: insertEntry.ruleSnapshot ?? null,
    };
    this.complianceHistory.set(id, entry);
    return entry;
  }

  async getCalendarPreferences(): Promise<CalendarPreference[]> {
    return Array.from(this.calendarPreferences.values());
  }

  async saveCalendarPreferences(preferences: InsertCalendarPreference[]): Promise<CalendarPreference[]> {
    const savedPreferences: CalendarPreference[] = [];
    
    for (const pref of preferences) {
      const existingPref = Array.from(this.calendarPreferences.values())
        .find(p => p.calendarId === pref.calendarId);
      
      if (existingPref) {
        // Update existing preference
        const updated: CalendarPreference = {
          ...existingPref,
          ...pref,
        };
        this.calendarPreferences.set(existingPref.id, updated);
        savedPreferences.push(updated);
      } else {
        // Create new preference
        const newPref: CalendarPreference = {
          id: randomUUID(),
          userId: pref.userId || null,
          calendarId: pref.calendarId,
          calendarName: pref.calendarName,
          backgroundColor: pref.backgroundColor || null,
          foregroundColor: pref.foregroundColor || null,
          isEnabled: pref.isEnabled ?? true,
          isPrimary: pref.isPrimary ?? false,
          accessRole: pref.accessRole || null,
          lastSyncedAt: pref.lastSyncedAt || null,
          createdAt: new Date(),
        };
        this.calendarPreferences.set(newPref.id, newPref);
        savedPreferences.push(newPref);
      }
    }
    
    return savedPreferences;
  }

  async updateCalendarToggle(calendarId: string, isEnabled: boolean): Promise<CalendarPreference | undefined> {
    const pref = Array.from(this.calendarPreferences.values())
      .find(p => p.calendarId === calendarId);
    
    if (!pref) {
      return undefined;
    }
    
    const updated: CalendarPreference = {
      ...pref,
      isEnabled,
    };
    
    this.calendarPreferences.set(pref.id, updated);
    return updated;
  }

  async deleteCalendarPreference(calendarId: string): Promise<boolean> {
    const pref = Array.from(this.calendarPreferences.values())
      .find(p => p.calendarId === calendarId);
    
    if (!pref) {
      return false;
    }
    
    this.calendarPreferences.delete(pref.id);
    return true;
  }

  async createGoogleEvent(event: InsertGoogleEvent): Promise<GoogleEvent> {
    const id = randomUUID();
    const googleEvent: GoogleEvent = {
      id,
      ...event,
      createdAt: new Date(),
    };
    this.googleEvents.set(id, googleEvent);
    return googleEvent;
  }

  async getGoogleEvent(id: string): Promise<GoogleEvent | undefined> {
    return this.googleEvents.get(id);
  }

  async getGoogleEventByGoogleId(googleEventId: string, calendarId: string): Promise<GoogleEvent | undefined> {
    return Array.from(this.googleEvents.values())
      .find(e => e.googleEventId === googleEventId && e.googleCalendarId === calendarId);
  }

  async getGoogleEventsByDateRange(startDate: Date, endDate: Date): Promise<GoogleEvent[]> {
    return Array.from(this.googleEvents.values())
      .filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return eventStart <= endDate && eventEnd >= startDate;
      });
  }

  async updateGoogleEvent(id: string, event: Partial<InsertGoogleEvent>): Promise<GoogleEvent | undefined> {
    const existing = this.googleEvents.get(id);
    if (!existing) return undefined;

    const updated: GoogleEvent = {
      ...existing,
      ...event,
    };
    this.googleEvents.set(id, updated);
    return updated;
  }

  async deleteGoogleEvent(id: string): Promise<boolean> {
    return this.googleEvents.delete(id);
  }

  async markGoogleEventAsConverted(id: string, jobId: string): Promise<GoogleEvent | undefined> {
    const existing = this.googleEvents.get(id);
    if (!existing) return undefined;

    const updated: GoogleEvent = {
      ...existing,
      isConverted: true,
      convertedToJobId: jobId,
    };
    this.googleEvents.set(id, updated);
    return updated;
  }

  async recalculateReportScore(reportInstanceId: string): Promise<void> {
    const instance = await this.getReportInstance(reportInstanceId);
    if (!instance) return;

    const checklistItems = await this.getChecklistItemsByJob(instance.jobId);
    const score = calculateScore(checklistItems);

    const scoreSummary: ScoreSummary = {
      grade: score.grade,
      passRate: score.passRate,
      failRate: score.failRate,
      completionRate: score.completionRate,
      totalItems: score.totalItems,
      passedItems: score.passedItems,
      failedItems: score.failedItems,
      updatedAt: new Date().toISOString(),
    };

    await this.updateReportInstance(reportInstanceId, {
      scoreSummary: JSON.stringify(scoreSummary),
    });
  }
}

export const storage = new MemStorage();
