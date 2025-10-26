import type { Express } from "express";
import { insertQaInspectionScoreSchema, insertQaChecklistSchema, insertQaChecklistItemSchema, insertQaChecklistResponseSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { paginationParamsSchema } from "@shared/pagination";

// This file contains QA routes to be added to server/routes.ts
// Insert these routes before: const httpServer = createServer(app);

export function registerQARoutes(
  app: Express,
  storage: any,
  isAuthenticated: any,
  requireRole: any,
  csrfSynchronisedProtection: any,
  handleValidationError: any,
  handleDatabaseError: any
) {
  // Quality Assurance Routes
  
  // QA Inspection Scores
  app.post("/api/qa/scores", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertQaInspectionScoreSchema.parse(req.body);
      const score = await storage.createQaInspectionScore(validated);
      res.status(201).json(score);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create QA score');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/scores", isAuthenticated, async (req, res) => {
    try {
      const { page = '1', limit = '20' } = req.query;
      const params = paginationParamsSchema.parse({ page: Number(page), limit: Number(limit) });
      const scores = await storage.getQaInspectionScoresPaginated(params);
      res.json(scores);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA scores');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/scores/job/:jobId", isAuthenticated, async (req, res) => {
    try {
      const score = await storage.getQaInspectionScoreByJob(req.params.jobId);
      if (!score) {
        return res.status(404).json({ message: "QA score not found for this job" });
      }
      res.json(score);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job QA score');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/scores/inspector/:inspectorId", isAuthenticated, async (req, res) => {
    try {
      const scores = await storage.getQaInspectionScoresByInspector(req.params.inspectorId);
      res.json(scores);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch inspector QA scores');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/scores/review-status/:status", isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const scores = await storage.getQaInspectionScoresByReviewStatus(req.params.status);
      res.json(scores);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA scores by review status');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/qa/scores/:id/review", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { status, notes } = req.body;
      const reviewerId = req.user?.claims?.sub;
      
      if (!reviewerId) {
        return res.status(401).json({ message: "Reviewer ID not found" });
      }
      
      const score = await storage.reviewQaInspectionScore(req.params.id, reviewerId, status, notes);
      if (!score) {
        return res.status(404).json({ message: "QA score not found" });
      }
      res.json(score);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'review QA score');
      res.status(status).json({ message });
    }
  });

  // QA Checklists
  app.post("/api/qa/checklists", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertQaChecklistSchema.parse(req.body);
      const checklist = await storage.createQaChecklist(validated);
      res.status(201).json(checklist);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create QA checklist');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/checklists", isAuthenticated, async (req, res) => {
    try {
      const { category, active } = req.query;
      
      let checklists;
      if (category) {
        checklists = await storage.getQaChecklistsByCategory(category as string);
      } else if (active === 'true') {
        checklists = await storage.getActiveQaChecklists();
      } else {
        checklists = await storage.getAllQaChecklists();
      }
      
      res.json(checklists);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA checklists');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/checklists/:id", isAuthenticated, async (req, res) => {
    try {
      const checklist = await storage.getQaChecklist(req.params.id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.json(checklist);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA checklist');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/qa/checklists/:id", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const checklist = await storage.updateQaChecklist(req.params.id, req.body);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.json(checklist);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update QA checklist');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/qa/checklists/:id/toggle-active", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const checklist = await storage.toggleQaChecklistActive(req.params.id);
      if (!checklist) {
        return res.status(404).json({ message: "Checklist not found" });
      }
      res.json(checklist);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'toggle QA checklist active');
      res.status(status).json({ message });
    }
  });

  // QA Checklist Items
  app.post("/api/qa/checklist-items", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertQaChecklistItemSchema.parse(req.body);
      const item = await storage.createQaChecklistItem(validated);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create QA checklist item');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/checklists/:checklistId/items", isAuthenticated, async (req, res) => {
    try {
      const { critical } = req.query;
      
      let items;
      if (critical === 'true') {
        items = await storage.getCriticalQaChecklistItems(req.params.checklistId);
      } else {
        items = await storage.getQaChecklistItems(req.params.checklistId);
      }
      
      res.json(items);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA checklist items');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/qa/checklist-items/:id", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const item = await storage.updateQaChecklistItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      res.json(item);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'update QA checklist item');
      res.status(status).json({ message });
    }
  });

  app.post("/api/qa/checklists/:checklistId/items/reorder", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const { itemIds } = req.body;
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ message: "Item IDs must be an array" });
      }
      
      const success = await storage.reorderQaChecklistItems(req.params.checklistId, itemIds);
      res.json({ success });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'reorder QA checklist items');
      res.status(status).json({ message });
    }
  });

  // QA Checklist Responses
  app.post("/api/qa/checklist-responses", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertQaChecklistResponseSchema.parse({
        ...req.body,
        userId: req.body.userId || req.user?.claims?.sub,
      });
      const response = await storage.createQaChecklistResponse(validated);
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create QA checklist response');
      res.status(status).json({ message });
    }
  });

  app.post("/api/qa/checklist-responses/bulk", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const { responses } = req.body;
      if (!Array.isArray(responses)) {
        return res.status(400).json({ message: "Responses must be an array" });
      }
      
      const userId = req.user?.claims?.sub;
      const validatedResponses = responses.map((r: any) => 
        insertQaChecklistResponseSchema.parse({
          ...r,
          userId: r.userId || userId,
        })
      );
      
      const createdResponses = await storage.bulkCreateQaChecklistResponses(validatedResponses);
      res.status(201).json(createdResponses);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk create QA checklist responses');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/checklist-responses/job/:jobId", isAuthenticated, async (req, res) => {
    try {
      const responses = await storage.getQaChecklistResponsesByJob(req.params.jobId);
      res.json(responses);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job QA checklist responses');
      res.status(status).json({ message });
    }
  });

  // QA Performance Metrics
  app.get("/api/qa/performance/:userId", isAuthenticated, async (req, res) => {
    try {
      const { period } = req.query;
      
      let metric;
      if (period) {
        metric = await storage.getLatestQaPerformanceMetric(req.params.userId, period as string);
      } else {
        const metrics = await storage.getQaPerformanceMetricsByUser(req.params.userId);
        metric = metrics[0]; // Return the most recent
      }
      
      if (!metric) {
        return res.status(404).json({ message: "Performance metric not found" });
      }
      res.json(metric);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA performance metric');
      res.status(status).json({ message });
    }
  });

  app.post("/api/qa/performance/calculate/:userId", isAuthenticated, requireRole(['admin', 'manager']), csrfSynchronisedProtection, async (req, res) => {
    try {
      const { period, startDate, endDate } = req.body;
      
      if (!period || !startDate || !endDate) {
        return res.status(400).json({ message: "Period, start date, and end date are required" });
      }
      
      const metric = await storage.calculateQaPerformanceMetrics(
        req.params.userId,
        period,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.status(201).json(metric);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'calculate QA performance metrics');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/performance/team/:period", isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const metrics = await storage.getTeamQaPerformanceMetrics(
        req.params.period,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(metrics);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch team QA performance metrics');
      res.status(status).json({ message });
    }
  });

  // QA Analytics
  app.get("/api/qa/analytics/score-trends", isAuthenticated, async (req, res) => {
    try {
      const { userId, days } = req.query;
      const trends = await storage.getQaScoreTrends(
        userId as string | undefined,
        days ? Number(days) : undefined
      );
      res.json(trends);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA score trends');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/analytics/category-breakdown", isAuthenticated, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      const breakdown = await storage.getQaCategoryBreakdown(
        userId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(breakdown);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA category breakdown');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/analytics/leaderboard/:period", isAuthenticated, async (req, res) => {
    try {
      const { limit } = req.query;
      const leaderboard = await storage.getQaLeaderboard(
        req.params.period,
        limit ? Number(limit) : undefined
      );
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA leaderboard');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/analytics/training-needs", isAuthenticated, requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const needs = await storage.getQaTrainingNeeds();
      res.json(needs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA training needs');
      res.status(status).json({ message });
    }
  });

  app.get("/api/qa/analytics/compliance-rate", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const rate = await storage.getQaComplianceRate(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(rate);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch QA compliance rate');
      res.status(status).json({ message });
    }
  });
}