import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertBuilderSchema,
  insertJobSchema,
  insertScheduleEventSchema,
  insertExpenseSchema,
  insertMileageLogSchema,
  insertReportTemplateSchema,
  insertReportInstanceSchema,
  insertPhotoSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/builders", async (_req, res) => {
    try {
      const builders = await storage.getAllBuilders();
      res.json(builders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch builders" });
    }
  });

  app.post("/api/builders", async (req, res) => {
    try {
      const validated = insertBuilderSchema.parse(req.body);
      const builder = await storage.createBuilder(validated);
      res.status(201).json(builder);
    } catch (error) {
      res.status(400).json({ message: "Invalid builder data", error });
    }
  });

  app.get("/api/builders/:id", async (req, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.json(builder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch builder" });
    }
  });

  app.put("/api/builders/:id", async (req, res) => {
    try {
      const validated = insertBuilderSchema.partial().parse(req.body);
      const builder = await storage.updateBuilder(req.params.id, validated);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.json(builder);
    } catch (error) {
      res.status(400).json({ message: "Invalid builder data", error });
    }
  });

  app.delete("/api/builders/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBuilder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Builder not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete builder" });
    }
  });

  app.get("/api/jobs", async (_req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      const job = await storage.createJob(validated);
      res.status(201).json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid job data", error });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  app.put("/api/jobs/:id", async (req, res) => {
    try {
      const validated = insertJobSchema.partial().parse(req.body);
      const job = await storage.updateJob(req.params.id, validated);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(400).json({ message: "Invalid job data", error });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.get("/api/schedule-events", async (req, res) => {
    try {
      const { startDate, endDate, jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const events = await storage.getScheduleEventsByJob(jobId);
        return res.json(events);
      }

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const events = await storage.getScheduleEventsByDateRange(start, end);
        return res.json(events);
      }

      res.status(400).json({ message: "Either jobId or startDate/endDate query parameters are required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule events" });
    }
  });

  app.post("/api/schedule-events", async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validated);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule event data", error });
    }
  });

  app.get("/api/schedule-events/:id", async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule event" });
    }
  });

  app.put("/api/schedule-events/:id", async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule event data", error });
    }
  });

  app.delete("/api/schedule-events/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteScheduleEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete schedule event" });
    }
  });

  app.get("/api/expenses", async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const expenses = await storage.getExpensesByJob(jobId);
        return res.json(expenses);
      }

      const expenses = await storage.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data", error });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const validated = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validated);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(400).json({ message: "Invalid expense data", error });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.get("/api/mileage-logs", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const logs = await storage.getMileageLogsByDateRange(start, end);
        return res.json(logs);
      }

      const logs = await storage.getAllMileageLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mileage logs" });
    }
  });

  app.post("/api/mileage-logs", async (req, res) => {
    try {
      const validated = insertMileageLogSchema.parse(req.body);
      const log = await storage.createMileageLog(validated);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid mileage log data", error });
    }
  });

  app.get("/api/mileage-logs/:id", async (req, res) => {
    try {
      const log = await storage.getMileageLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mileage log" });
    }
  });

  app.put("/api/mileage-logs/:id", async (req, res) => {
    try {
      const validated = insertMileageLogSchema.partial().parse(req.body);
      const log = await storage.updateMileageLog(req.params.id, validated);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid mileage log data", error });
    }
  });

  app.delete("/api/mileage-logs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteMileageLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Mileage log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mileage log" });
    }
  });

  app.get("/api/report-templates", async (_req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report templates" });
    }
  });

  app.post("/api/report-templates", async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid report template data", error });
    }
  });

  app.get("/api/report-templates/:id", async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report template" });
    }
  });

  app.put("/api/report-templates/:id", async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateReportTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid report template data", error });
    }
  });

  app.delete("/api/report-templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReportTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Report template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete report template" });
    }
  });

  app.get("/api/report-instances", async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const instances = await storage.getReportInstancesByJob(jobId);
        return res.json(instances);
      }

      res.status(400).json({ message: "jobId query parameter is required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report instances" });
    }
  });

  app.post("/api/report-instances", async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.parse(req.body);
      const instance = await storage.createReportInstance(validated);
      res.status(201).json(instance);
    } catch (error) {
      res.status(400).json({ message: "Invalid report instance data", error });
    }
  });

  app.get("/api/report-instances/:id", async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report instance" });
    }
  });

  app.put("/api/report-instances/:id", async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.partial().parse(req.body);
      const instance = await storage.updateReportInstance(req.params.id, validated);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found" });
      }
      res.json(instance);
    } catch (error) {
      res.status(400).json({ message: "Invalid report instance data", error });
    }
  });

  app.get("/api/photos", async (req, res) => {
    try {
      const { jobId, checklistItemId } = req.query;

      if (checklistItemId && typeof checklistItemId === "string") {
        const photos = await storage.getPhotosByChecklistItem(checklistItemId);
        return res.json(photos);
      }

      if (jobId && typeof jobId === "string") {
        const photos = await storage.getPhotosByJob(jobId);
        return res.json(photos);
      }

      res.status(400).json({ message: "Either jobId or checklistItemId query parameter is required" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", async (req, res) => {
    try {
      const validated = insertPhotoSchema.parse(req.body);
      const photo = await storage.createPhoto(validated);
      res.status(201).json(photo);
    } catch (error) {
      res.status(400).json({ message: "Invalid photo data", error });
    }
  });

  app.get("/api/photos/:id", async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.json(photo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photo" });
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  app.get("/api/forecasts", async (req, res) => {
    try {
      const forecasts = await storage.getAllForecasts();
      res.json(forecasts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forecasts" });
    }
  });

  app.get("/api/forecasts/:id", async (req, res) => {
    try {
      const forecast = await storage.getForecast(req.params.id);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found" });
      }
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch forecast" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
