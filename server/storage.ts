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
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createBuilder(builder: InsertBuilder): Promise<Builder>;
  getBuilder(id: string): Promise<Builder | undefined>;
  getAllBuilders(): Promise<Builder[]>;
  updateBuilder(id: string, builder: Partial<InsertBuilder>): Promise<Builder | undefined>;
  deleteBuilder(id: string): Promise<boolean>;

  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getAllJobs(): Promise<Job[]>;
  updateJob(id: string, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  createScheduleEvent(event: InsertScheduleEvent): Promise<ScheduleEvent>;
  getScheduleEvent(id: string): Promise<ScheduleEvent | undefined>;
  getScheduleEventsByJob(jobId: string): Promise<ScheduleEvent[]>;
  getScheduleEventsByDateRange(startDate: Date, endDate: Date): Promise<ScheduleEvent[]>;
  updateScheduleEvent(id: string, event: Partial<InsertScheduleEvent>): Promise<ScheduleEvent | undefined>;
  deleteScheduleEvent(id: string): Promise<boolean>;

  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  getAllExpenses(): Promise<Expense[]>;
  getExpensesByJob(jobId: string): Promise<Expense[]>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  getAllMileageLogs(): Promise<MileageLog[]>;
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
  getReportInstancesByJob(jobId: string): Promise<ReportInstance[]>;
  updateReportInstance(id: string, instance: Partial<InsertReportInstance>): Promise<ReportInstance | undefined>;

  createPhoto(photo: InsertPhoto): Promise<Photo>;
  getPhoto(id: string): Promise<Photo | undefined>;
  getPhotosByJob(jobId: string): Promise<Photo[]>;
  getPhotosByChecklistItem(checklistItemId: string): Promise<Photo[]>;
  updatePhoto(id: string, photo: Partial<InsertPhoto>): Promise<Photo | undefined>;
  deletePhoto(id: string): Promise<boolean>;

  createForecast(forecast: InsertForecast): Promise<Forecast>;
  getForecast(id: string): Promise<Forecast | undefined>;
  getAllForecasts(): Promise<Forecast[]>;
  getForecastsByJob(jobId: string): Promise<Forecast[]>;
  updateForecast(id: string, forecast: Partial<InsertForecast>): Promise<Forecast | undefined>;
  deleteForecast(id: string): Promise<boolean>;
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

    this.reportTemplates.set(template1Id, template1);
    this.reportTemplates.set(template2Id, template2);

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

  async getExpensesByJob(jobId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(
      (expense) => expense.jobId === jobId,
    );
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
    };
    this.reportInstances.set(id, instance);
    return instance;
  }

  async getReportInstance(id: string): Promise<ReportInstance | undefined> {
    return this.reportInstances.get(id);
  }

  async getReportInstancesByJob(jobId: string): Promise<ReportInstance[]> {
    return Array.from(this.reportInstances.values()).filter(
      (instance) => instance.jobId === jobId,
    );
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
    const photo: Photo = {
      id,
      jobId: insertPhoto.jobId,
      checklistItemId: insertPhoto.checklistItemId ?? null,
      filePath: insertPhoto.filePath,
      caption: insertPhoto.caption ?? null,
      tags: insertPhoto.tags ?? null,
      uploadedAt: insertPhoto.uploadedAt ?? new Date(),
    };
    this.photos.set(id, photo);
    return photo;
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    return this.photos.get(id);
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

  async createForecast(insertForecast: InsertForecast): Promise<Forecast> {
    const id = randomUUID();
    const forecast: Forecast = {
      id,
      jobId: insertForecast.jobId,
      predictedTDL: insertForecast.predictedTDL ?? null,
      predictedDLO: insertForecast.predictedDLO ?? null,
      actualTDL: insertForecast.actualTDL ?? null,
      actualDLO: insertForecast.actualDLO ?? null,
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
}

export const storage = new MemStorage();
