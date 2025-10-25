import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleCalendarService, getUncachableGoogleCalendarClient, allDayDateToUTC } from "./googleCalendar";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { generateReportPDF } from "./pdfGenerator.tsx";
import { generateThumbnail } from "./thumbnailGenerator";
import { healthz, readyz, status } from "./health";
import { generateToken, csrfSynchronisedProtection } from "./csrf";
import { createAuditLog } from "./auditLogger";
import { requireRole, checkResourceOwnership, canEdit, canCreate, canDelete, type UserRole } from "./permissions";
import {
  insertBuilderSchema,
  insertBuilderContactSchema,
  updateBuilderContactSchema,
  insertBuilderAgreementSchema,
  updateBuilderAgreementSchema,
  insertBuilderProgramSchema,
  updateBuilderProgramSchema,
  insertBuilderInteractionSchema,
  updateBuilderInteractionSchema,
  insertDevelopmentSchema,
  updateDevelopmentSchema,
  insertLotSchema,
  updateLotSchema,
  insertPlanSchema,
  insertJobSchema,
  insertScheduleEventSchema,
  insertExpenseSchema,
  insertMileageLogSchema,
  insertReportTemplateSchema,
  insertReportInstanceSchema,
  insertPhotoSchema,
  insertChecklistItemSchema,
  updateChecklistItemSchema,
  insertComplianceRuleSchema,
  insertForecastSchema,
  insertCalendarPreferenceSchema,
  insertUploadSessionSchema,
  insertEmailPreferenceSchema,
} from "@shared/schema";
import { emailService } from "./email/emailService";
import { jobAssignedTemplate } from "./email/templates/jobAssigned";
import { jobStatusChangedTemplate } from "./email/templates/jobStatusChanged";
import { reportReadyTemplate } from "./email/templates/reportReady";
import { calendarEventNotificationTemplate } from "./email/templates/calendarEventNotification";
import { paginationParamsSchema, cursorPaginationParamsSchema, photoCursorPaginationParamsSchema } from "@shared/pagination";
import {
  evaluateJobCompliance,
  evaluateReportCompliance,
  updateJobComplianceStatus,
  updateReportComplianceStatus,
} from "./complianceService";
import { z, ZodError } from "zod";
import { serverLogger } from "./logger";
import { validateAuthConfig, getRecentAuthErrors, sanitizeEnvironmentForClient, type ValidationReport } from "./auth/validation";
import { getOidcConfig, getRegisteredStrategies } from "./replitAuth";
import { getConfig } from "./config";
import { getTroubleshootingGuide, getAllTroubleshootingGuides, suggestTroubleshootingGuide } from "./auth/troubleshooting";
import { db } from "./db";
import { sql } from "drizzle-orm";

// Error handling helpers
function logError(context: string, error: unknown, additionalInfo?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  serverLogger.error(`[${context}] Error:`, {
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo,
  });
}

function handleValidationError(error: unknown): { status: number; message: string } {
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    const fieldName = firstError.path.join('.');
    return {
      status: 400,
      message: `Please check your input: ${firstError.message}${fieldName ? ` (${fieldName})` : ''}`,
    };
  }
  return { status: 400, message: "Please check your input and try again" };
}

function handleDatabaseError(error: unknown, operation: string): { status: number; message: string } {
  logError('Database', error, { operation });
  return {
    status: 500,
    message: "We're having trouble processing your request. Please try again.",
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoints (no authentication required for monitoring)
  app.get("/healthz", healthz);
  app.get("/readyz", readyz);
  app.get("/api/status", status);
  
  // Setup Replit Auth middleware
  await setupAuth(app);

  // CSRF token generation endpoint (must be authenticated)
  app.get("/api/csrf-token", isAuthenticated, (req, res) => {
    try {
      const csrfToken = generateToken(req, res);
      res.json({ csrfToken });
    } catch (error) {
      logError('CSRF/GenerateToken', error);
      res.status(500).json({ message: "Failed to generate CSRF token" });
    }
  });

  // Replit Auth route - get authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      logError('Auth/GetUser', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Health endpoint - unauthenticated, production-safe
  app.get("/api/health", async (req, res) => {
    try {
      const config = getConfig();
      const report = await validateAuthConfig({ 
        skipOIDC: false,
        skipDatabase: false 
      });

      const oidcResult = report.results.find(r => r.component === 'OIDC Discovery');
      const dbResult = report.results.find(r => r.component === 'Database Connectivity');
      const domainsResult = report.results.find(r => r.component === 'Registered Domains');
      
      const health = {
        status: report.overall === 'pass' ? 'healthy' : report.overall === 'degraded' ? 'degraded' : 'unhealthy',
        timestamp: report.timestamp,
        version: process.env.npm_package_version || '1.0.0',
        environment: config.nodeEnv,
        components: {
          oidc: {
            status: oidcResult?.status === 'pass' ? 'working' : 'failed',
            message: oidcResult?.message,
            error: oidcResult?.error,
          },
          database: {
            status: dbResult?.status === 'pass' ? 'connected' : dbResult?.status === 'warning' ? 'not_configured' : 'disconnected',
            message: dbResult?.message,
            error: dbResult?.error,
          },
          sessionStore: {
            status: config.databaseUrl ? 'postgresql' : 'in_memory',
            message: config.databaseUrl 
              ? 'Using PostgreSQL session store' 
              : 'Using in-memory session store (development only)',
          },
          domains: {
            registered: config.replitDomains,
            status: domainsResult?.status === 'pass' ? 'valid' : 'invalid',
            message: domainsResult?.message,
          },
          currentDomain: {
            hostname: req.hostname,
            status: config.replitDomains.some(d => req.hostname.endsWith(d) || req.hostname === d) 
              ? 'recognized' 
              : 'unknown',
          },
        },
      };

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logError('Health/Check', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Diagnostics endpoint - authenticated admin only
  // SECURITY WARNING: This endpoint is production-safe because it uses sanitizeEnvironmentForClient()
  // to ensure NO secrets (SESSION_SECRET, DATABASE_URL credentials, full REPL_ID) are exposed
  app.get("/api/auth/diagnostics", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const config = getConfig();
      const oidcConfig = await getOidcConfig();
      const metadata = oidcConfig.serverMetadata();
      const strategies = getRegisteredStrategies();
      const recentErrors = getRecentAuthErrors();
      
      const report = await validateAuthConfig({ 
        skipOIDC: false,
        skipDatabase: false 
      });

      let sessionStats: any = null;
      if (config.databaseUrl) {
        try {
          const sessionCountResult = await db.execute(sql`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN expire > NOW() THEN 1 END) as active,
                   COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired
            FROM sessions
          `);
          sessionStats = {
            total: parseInt(sessionCountResult.rows[0]?.total as string || '0'),
            active: parseInt(sessionCountResult.rows[0]?.active as string || '0'),
            expired: parseInt(sessionCountResult.rows[0]?.expired as string || '0'),
          };
        } catch (error) {
          sessionStats = { error: 'Failed to fetch session statistics' };
        }
      }

      const domainMappingTests = config.replitDomains.map(domain => {
        const testHostnames = [
          domain,
          `www.${domain}`,
          `subdomain.${domain}`,
        ];
        
        return {
          domain,
          tests: testHostnames.map(hostname => ({
            hostname,
            wouldMatch: hostname === domain || hostname.endsWith(domain),
          })),
        };
      });

      // SECURITY: Use sanitized environment data to prevent secret exposure
      const sanitizedEnv = sanitizeEnvironmentForClient();

      const diagnostics = {
        timestamp: new Date().toISOString(),
        validationReport: report,
        oidcConfiguration: {
          issuer: metadata.issuer,
          authorizationEndpoint: metadata.authorization_endpoint,
          tokenEndpoint: metadata.token_endpoint,
          userinfoEndpoint: metadata.userinfo_endpoint,
          endSessionEndpoint: metadata.end_session_endpoint,
          jwksUri: metadata.jwks_uri,
          rfc9207Support: metadata.authorization_response_iss_parameter_supported || false,
          scopesSupported: metadata.scopes_supported,
          responseTypesSupported: metadata.response_types_supported,
        },
        registeredStrategies: strategies.map(name => ({
          name,
          domain: name.replace('replitauth:', ''),
        })),
        domainMappingTests,
        sessionStore: {
          type: config.databaseUrl ? 'postgresql' : 'in_memory',
          statistics: sessionStats,
        },
        recentAuthErrors: recentErrors.slice(0, 100),
        // SECURITY: Only use sanitized environment data
        environment: sanitizedEnv,
      };

      res.json(diagnostics);
    } catch (error) {
      logError('Auth/Diagnostics', error);
      res.status(500).json({ 
        message: "Failed to generate diagnostics",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Auth metrics endpoint - authenticated admin only
  app.get("/api/auth/metrics", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { authMonitoring } = await import("./auth/monitoring");
      const metrics = authMonitoring.getMetrics();
      res.json(metrics);
    } catch (error) {
      logError('Auth/Metrics', error);
      res.status(500).json({ 
        message: "Failed to fetch auth metrics",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Troubleshooting guide endpoint - public (no auth required)
  app.get("/api/auth/troubleshooting/:code?", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (code) {
        const guide = getTroubleshootingGuide(code);
        
        if (guide) {
          res.json(guide);
        } else {
          const generalGuide = getTroubleshootingGuide('GENERAL_AUTH_ERROR');
          res.status(404).json({
            message: `No troubleshooting guide found for code: ${code}`,
            fallbackGuide: generalGuide,
          });
        }
      } else {
        const allGuides = getAllTroubleshootingGuides();
        res.json({
          guides: allGuides,
          total: allGuides.length,
          categories: {
            configuration: allGuides.filter(g => g.category === 'configuration').length,
            network: allGuides.filter(g => g.category === 'network').length,
            environment: allGuides.filter(g => g.category === 'environment').length,
            infrastructure: allGuides.filter(g => g.category === 'infrastructure').length,
          },
        });
      }
    } catch (error) {
      logError('Auth/Troubleshooting', error);
      res.status(500).json({ 
        message: "Failed to fetch troubleshooting guide",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Dev mode login bypass - development only
  app.get("/api/dev/login-as", async (req: any, res) => {
    const { devModeLogin } = await import("./auth/devMode");
    await devModeLogin(req, res);
  });

  // Dev mode status endpoint - check if dev mode is enabled
  app.get("/api/dev/status", async (req: any, res) => {
    try {
      const { getDevModeStatus } = await import("./auth/devMode");
      const status = getDevModeStatus(req);
      res.json(status);
    } catch (error) {
      logError('DevMode/Status', error);
      res.status(500).json({ 
        message: "Failed to check dev mode status",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Domain testing endpoint - authenticated admin only
  app.post("/api/auth/test-domain", isAuthenticated, requireRole('admin'), async (req: any, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ 
          message: "Domain is required and must be a string",
        });
      }

      const config = getConfig();
      const registeredDomains = config.replitDomains;
      
      // Test if domain would be recognized
      const exactMatch = registeredDomains.find(d => d === domain);
      const endsWithMatch = registeredDomains.find(d => domain.endsWith(d));
      const localhostFallback = domain === 'localhost' && registeredDomains.length > 0;
      
      let recognized = false;
      let strategy: string | null = null;
      let matchType: 'exact' | 'subdomain' | 'localhost_fallback' | 'none' = 'none';
      let matchedDomain: string | null = null;
      
      if (exactMatch) {
        recognized = true;
        strategy = `replitauth:${exactMatch}`;
        matchType = 'exact';
        matchedDomain = exactMatch;
      } else if (endsWithMatch) {
        recognized = true;
        strategy = `replitauth:${endsWithMatch}`;
        matchType = 'subdomain';
        matchedDomain = endsWithMatch;
      } else if (localhostFallback) {
        recognized = true;
        strategy = `replitauth:${registeredDomains[0]}`;
        matchType = 'localhost_fallback';
        matchedDomain = registeredDomains[0];
      }
      
      const result = {
        domain,
        recognized,
        strategy,
        matchType,
        matchedDomain,
        registeredDomains,
        explanation: recognized 
          ? matchType === 'exact'
            ? `Domain matches exactly with registered domain: ${matchedDomain}`
            : matchType === 'subdomain'
            ? `Domain is a subdomain of registered domain: ${matchedDomain}`
            : `Localhost development mode: falls back to first registered domain: ${matchedDomain}`
          : `Domain does not match any registered domains. Available: ${registeredDomains.join(', ')}`,
      };
      
      res.json(result);
    } catch (error) {
      logError('Auth/TestDomain', error);
      res.status(500).json({ 
        message: "Failed to test domain",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get("/api/builders", isAuthenticated, async (req, res) => {
    try {
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getBuildersPaginated(params);
        return res.json(result);
      }
      const builders = await storage.getAllBuilders();
      res.json(builders);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch builders');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderSchema.parse(req.body);
      const builder = await storage.createBuilder(validated);
      
      // Audit log: Builder creation
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder.create',
        resourceType: 'builder',
        resourceId: builder.id,
        metadata: { builderName: builder.name, companyName: builder.companyName },
      }, storage);
      
      res.status(201).json(builder);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:id", isAuthenticated, async (req, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      res.json(builder);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderSchema.partial().parse(req.body);
      const builder = await storage.updateBuilder(req.params.id, validated);
      if (!builder) {
        return res.status(404).json({ message: "Builder not found. It may have been deleted." });
      }
      
      // Audit log: Builder update
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder.update',
        resourceType: 'builder',
        resourceId: req.params.id,
        changes: validated,
        metadata: { builderName: builder.name, companyName: builder.companyName },
      }, storage);
      
      res.json(builder);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:id", isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const builder = await storage.getBuilder(req.params.id);
      const deleted = await storage.deleteBuilder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Builder not found. It may have already been deleted." });
      }
      
      // Audit log: Builder deletion
      if (builder) {
        await createAuditLog(req, {
          userId: req.user.claims.sub,
          action: 'builder.delete',
          resourceType: 'builder',
          resourceId: req.params.id,
          metadata: { builderName: builder.name, companyName: builder.companyName },
        }, storage);
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder');
      res.status(status).json({ message });
    }
  });

  // Builder Contacts routes
  app.get("/api/builders/:builderId/contacts", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getBuilderContacts(req.params.builderId);
      res.json(contacts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder contacts');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/contacts", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderContactSchema.parse({
        ...req.body,
        builderId: req.params.builderId,
      });
      const contact = await storage.createBuilderContact(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_contact.create',
        resourceType: 'builder_contact',
        resourceId: contact.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder contact');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/contacts/:id", isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }
      res.json(contact);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder contact');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/contacts/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderContact(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      const validated = updateBuilderContactSchema.parse(req.body);
      const contact = await storage.updateBuilderContact(req.params.id, validated);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_contact.update',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder contact');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/contacts/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      const deleted = await storage.deleteBuilderContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_contact.delete',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder contact');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/contacts/:id/primary", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const contact = await storage.getBuilderContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      if (contact.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Contact not found for this builder" });
      }

      await storage.setPrimaryContact(req.params.builderId, req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_contact.set_primary',
        resourceType: 'builder_contact',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          contactName: contact.name,
          contactRole: contact.role,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'set primary contact');
      res.status(status).json({ message });
    }
  });

  // Builder Agreements routes
  app.get("/api/builders/:builderId/agreements", isAuthenticated, async (req, res) => {
    try {
      const agreements = await storage.getBuilderAgreements(req.params.builderId);
      res.json(agreements);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder agreements');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/agreements", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderAgreementSchema.parse({ ...req.body, builderId: req.params.builderId });
      const agreement = await storage.createBuilderAgreement(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_agreement.create',
        resourceType: 'builder_agreement',
        resourceId: agreement.id,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement.agreementName,
          status: agreement.status,
        },
      }, storage);
      
      res.status(201).json(agreement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder agreement');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getBuilderAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (agreement.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }
      res.json(agreement);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder agreement');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/agreements/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderAgreement(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }

      const validated = updateBuilderAgreementSchema.parse(req.body);
      const agreement = await storage.updateBuilderAgreement(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_agreement.update',
        resourceType: 'builder_agreement',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement?.agreementName,
        },
      }, storage);
      
      res.json(agreement);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder agreement');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/agreements/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const agreement = await storage.getBuilderAgreement(req.params.id);
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      if (agreement.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Agreement not found for this builder" });
      }

      const deleted = await storage.deleteBuilderAgreement(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_agreement.delete',
        resourceType: 'builder_agreement',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          agreementName: agreement.agreementName,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder agreement');
      res.status(status).json({ message });
    }
  });

  // Builder Programs routes
  app.get("/api/builders/:builderId/programs", isAuthenticated, async (req, res) => {
    try {
      const programs = await storage.getBuilderPrograms(req.params.builderId);
      res.json(programs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder programs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/programs", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderProgramSchema.parse({ ...req.body, builderId: req.params.builderId });
      const program = await storage.createBuilderProgram(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_program.create',
        resourceType: 'builder_program',
        resourceId: program.id,
        metadata: { 
          builderName: builder?.name,
          programName: program.programName,
          programType: program.programType,
        },
      }, storage);
      
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder program');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/programs/:id", isAuthenticated, async (req, res) => {
    try {
      const program = await storage.getBuilderProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (program.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }
      res.json(program);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder program');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/programs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderProgram(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }

      const validated = updateBuilderProgramSchema.parse(req.body);
      const program = await storage.updateBuilderProgram(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_program.update',
        resourceType: 'builder_program',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          programName: program?.programName,
        },
      }, storage);
      
      res.json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder program');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/programs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const program = await storage.getBuilderProgram(req.params.id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      if (program.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Program not found for this builder" });
      }

      const deleted = await storage.deleteBuilderProgram(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_program.delete',
        resourceType: 'builder_program',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          programName: program.programName,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder program');
      res.status(status).json({ message });
    }
  });

  // Builder Interactions routes
  app.get("/api/builders/:builderId/interactions", isAuthenticated, async (req, res) => {
    try {
      const interactions = await storage.getBuilderInteractions(req.params.builderId);
      res.json(interactions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder interactions');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/interactions", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertBuilderInteractionSchema.parse({ 
        ...req.body, 
        builderId: req.params.builderId,
        createdBy: req.user.claims.sub,
      });
      const interaction = await storage.createBuilderInteraction(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_interaction.create',
        resourceType: 'builder_interaction',
        resourceId: interaction.id,
        metadata: { 
          builderName: builder?.name,
          interactionType: interaction.interactionType,
          subject: interaction.subject,
        },
      }, storage);
      
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create builder interaction');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/interactions/:id", isAuthenticated, async (req, res) => {
    try {
      const interaction = await storage.getBuilderInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (interaction.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }
      res.json(interaction);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder interaction');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/interactions/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getBuilderInteraction(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }

      const validated = updateBuilderInteractionSchema.parse(req.body);
      const interaction = await storage.updateBuilderInteraction(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_interaction.update',
        resourceType: 'builder_interaction',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          subject: interaction?.subject,
        },
      }, storage);
      
      res.json(interaction);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update builder interaction');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/interactions/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const interaction = await storage.getBuilderInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ message: "Interaction not found" });
      }
      if (interaction.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Interaction not found for this builder" });
      }

      const deleted = await storage.deleteBuilderInteraction(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'builder_interaction.delete',
        resourceType: 'builder_interaction',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          subject: interaction.subject,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete builder interaction');
      res.status(status).json({ message });
    }
  });

  // Developments routes
  app.get("/api/builders/:builderId/developments", isAuthenticated, async (req, res) => {
    try {
      const developments = await storage.getDevelopments(req.params.builderId);
      res.json(developments);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch developments');
      res.status(status).json({ message });
    }
  });

  app.post("/api/builders/:builderId/developments", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertDevelopmentSchema.parse({ ...req.body, builderId: req.params.builderId });
      const development = await storage.createDevelopment(validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'development.create',
        resourceType: 'development',
        resourceId: development.id,
        metadata: { 
          builderName: builder?.name,
          developmentName: development.name,
          status: development.status,
        },
      }, storage);
      
      res.status(201).json(development);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create development');
      res.status(status).json({ message });
    }
  });

  app.get("/api/builders/:builderId/developments/:id", isAuthenticated, async (req, res) => {
    try {
      const development = await storage.getDevelopment(req.params.id);
      if (!development) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (development.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }
      res.json(development);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch development');
      res.status(status).json({ message });
    }
  });

  app.put("/api/builders/:builderId/developments/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getDevelopment(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (existing.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }

      const validated = updateDevelopmentSchema.parse(req.body);
      const development = await storage.updateDevelopment(req.params.id, validated);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'development.update',
        resourceType: 'development',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          builderName: builder?.name,
          developmentName: development?.name,
        },
      }, storage);
      
      res.json(development);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update development');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/builders/:builderId/developments/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const development = await storage.getDevelopment(req.params.id);
      if (!development) {
        return res.status(404).json({ message: "Development not found" });
      }
      if (development.builderId !== req.params.builderId) {
        return res.status(404).json({ message: "Development not found for this builder" });
      }

      const deleted = await storage.deleteDevelopment(req.params.id);
      
      const builder = await storage.getBuilder(req.params.builderId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'development.delete',
        resourceType: 'development',
        resourceId: req.params.id,
        metadata: { 
          builderName: builder?.name,
          developmentName: development.name,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete development');
      res.status(status).json({ message });
    }
  });

  // Lots routes
  app.get("/api/developments/:developmentId/lots", isAuthenticated, async (req, res) => {
    try {
      const lots = await storage.getLots(req.params.developmentId);
      res.json(lots);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lots');
      res.status(status).json({ message });
    }
  });

  app.post("/api/developments/:developmentId/lots", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertLotSchema.parse({ ...req.body, developmentId: req.params.developmentId });
      const lot = await storage.createLot(validated);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'lot.create',
        resourceType: 'lot',
        resourceId: lot.id,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot.lotNumber,
          status: lot.status,
        },
      }, storage);
      
      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create lot');
      res.status(status).json({ message });
    }
  });

  app.get("/api/developments/:developmentId/lots/:id", isAuthenticated, async (req, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (lot.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }
      res.json(lot);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lot');
      res.status(status).json({ message });
    }
  });

  app.put("/api/developments/:developmentId/lots/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const existing = await storage.getLot(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (existing.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }

      const validated = updateLotSchema.parse(req.body);
      const lot = await storage.updateLot(req.params.id, validated);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'lot.update',
        resourceType: 'lot',
        resourceId: req.params.id,
        changes: validated,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot?.lotNumber,
        },
      }, storage);
      
      res.json(lot);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update lot');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/developments/:developmentId/lots/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      if (lot.developmentId !== req.params.developmentId) {
        return res.status(404).json({ message: "Lot not found for this development" });
      }

      const deleted = await storage.deleteLot(req.params.id);
      
      const development = await storage.getDevelopment(req.params.developmentId);
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'lot.delete',
        resourceType: 'lot',
        resourceId: req.params.id,
        metadata: { 
          developmentName: development?.name,
          lotNumber: lot.lotNumber,
        },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete lot');
      res.status(status).json({ message });
    }
  });

  // Direct lot lookup (for fetching lot by ID without knowing development)
  app.get("/api/lots/:id", isAuthenticated, async (req, res) => {
    try {
      const lot = await storage.getLot(req.params.id);
      if (!lot) {
        return res.status(404).json({ message: "Lot not found" });
      }
      res.json(lot);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch lot');
      res.status(status).json({ message });
    }
  });

  // Plans routes
  app.get("/api/plans", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch plans');
      res.status(status).json({ message });
    }
  });

  app.get("/api/plans/builder/:builderId", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plans = await storage.getPlansByBuilder(req.params.builderId);
      res.json(plans);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder plans');
      res.status(status).json({ message });
    }
  });

  app.post("/api/plans", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(validated);
      
      // Audit log: Plan creation
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'plan.create',
        resourceType: 'plan',
        resourceId: plan.id,
        metadata: { planName: plan.planName, builderId: plan.builderId },
      }, storage);
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create plan');
      res.status(status).json({ message });
    }
  });

  app.get("/api/plans/:id", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch plan');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/plans/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(req.params.id, validated);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      // Audit log: Plan update
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'plan.update',
        resourceType: 'plan',
        resourceId: req.params.id,
        changes: validated,
        metadata: { planName: plan.planName },
      }, storage);
      
      res.json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update plan');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/plans/:id", isAuthenticated, requireRole('admin'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const plan = await storage.getPlan(req.params.id);
      const deleted = await storage.deletePlan(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Plan not found. It may have already been deleted." });
      }
      
      // Audit log: Plan deletion
      if (plan) {
        await createAuditLog(req, {
          userId: req.user.claims.sub,
          action: 'plan.delete',
          resourceType: 'plan',
          resourceId: req.params.id,
          metadata: { planName: plan.planName },
        }, storage);
      }
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete plan');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req: any, res) => {
    try {
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.claims.sub;
      
      // Inspectors only see their own jobs
      if (userRole === 'inspector') {
        if (req.query.cursor !== undefined || req.query.sortBy !== undefined || req.query.sortOrder !== undefined) {
          const params = cursorPaginationParamsSchema.parse(req.query);
          const result = await storage.getJobsCursorPaginatedByUser(userId, params);
          return res.json(result);
        }
        const jobs = await storage.getJobsByUser(userId);
        return res.json(jobs);
      }
      
      // Admins, managers, and viewers see all jobs
      if (req.query.cursor !== undefined || req.query.sortBy !== undefined || req.query.sortOrder !== undefined) {
        const params = cursorPaginationParamsSchema.parse(req.query);
        const result = await storage.getJobsCursorPaginated(params);
        return res.json(result);
      }
      if (req.query.limit !== undefined || req.query.offset !== undefined) {
        const params = paginationParamsSchema.parse(req.query);
        const result = await storage.getJobsPaginated(params);
        return res.json(result);
      }
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch jobs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/jobs", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertJobSchema.parse(req.body);
      // Sanitize builderId - convert empty string to undefined (which becomes null in DB)
      if (validated.builderId === '') {
        validated.builderId = undefined;
      }
      // Set createdBy to current user
      validated.createdBy = req.user.claims.sub;
      
      const job = await storage.createJob(validated);
      
      // Auto-generate checklist items from template based on inspection type
      if (job.inspectionType) {
        try {
          await storage.generateChecklistFromTemplate(job.id, job.inspectionType);
          serverLogger.info(`[Jobs] Auto-generated checklist for ${job.inspectionType} inspection (Job ${job.id})`);
        } catch (error) {
          // Log but don't fail job creation if checklist generation fails
          serverLogger.error('[Jobs] Failed to auto-generate checklist:', error);
        }
      }
      
      // Audit log: Job creation
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'job.create',
        resourceType: 'job',
        resourceId: job.id,
        metadata: { jobName: job.name, address: job.address, status: job.status, inspectionType: job.inspectionType },
      }, storage);
      
      res.status(201).json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create job');
      res.status(status).json({ message });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector', 'manager', 'viewer'), async (req: any, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted or the link may be outdated." });
      }
      
      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.claims.sub;
      if (userRole === 'inspector' && job.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only view your own jobs' });
      }
      
      res.json(job);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch job');
      res.status(status).json({ message });
    }
  });

  app.put("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      // Load existing job to check if status is changing to completed
      const existingJob = await storage.getJob(req.params.id);
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.claims.sub;
      if (userRole === 'inspector' && existingJob.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only edit your own jobs' });
      }

      const validated = insertJobSchema.partial().parse(req.body);
      // Sanitize builderId - convert empty string to undefined (which becomes null in DB)
      if (validated.builderId === '') {
        validated.builderId = undefined;
      }

      // Check if status is changing to "completed"
      const isCompletingNow = validated.status === 'completed' && existingJob.status !== 'completed';

      // Set completedDate if not already set and job is being completed
      if (isCompletingNow && !validated.completedDate) {
        validated.completedDate = new Date();
      }

      // Update the job
      const job = await storage.updateJob(req.params.id, validated);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      // Audit log: Track job status changes
      if (validated.status && existingJob.status !== validated.status) {
        await createAuditLog(req, {
          userId: req.user.claims.sub,
          action: 'job.status_changed',
          resourceType: 'job',
          resourceId: req.params.id,
          changes: { from: existingJob.status, to: validated.status },
          metadata: { jobName: existingJob.name, address: existingJob.address },
        }, storage);
      } else if (Object.keys(validated).length > 0) {
        // Log general job updates
        await createAuditLog(req, {
          userId: req.user.claims.sub,
          action: 'job.update',
          resourceType: 'job',
          resourceId: req.params.id,
          changes: validated,
          metadata: { jobName: existingJob.name },
        }, storage);
      }

      res.json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update job');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, requireRole('admin', 'inspector'), csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have already been deleted." });
      }
      
      // Check ownership for inspectors
      const userRole = (req.user.role as UserRole) || 'inspector';
      const userId = req.user.claims.sub;
      if (userRole === 'inspector' && job.createdBy !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only delete your own jobs' });
      }
      
      const deleted = await storage.deleteJob(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Job not found. It may have already been deleted." });
      }
      
      // Audit log: Job deletion
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'job.delete',
        resourceType: 'job',
        resourceId: req.params.id,
        metadata: { jobName: job.name, address: job.address, status: job.status },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete job');
      res.status(status).json({ message });
    }
  });

  // Bulk delete jobs
  app.delete("/api/jobs/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one job ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 jobs at once" });
      }

      const deleted = await storage.bulkDeleteJobs(ids);
      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete jobs');
      res.status(status).json({ message });
    }
  });

  // Export jobs
  app.post("/api/jobs/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one job ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 jobs at once" });
      }

      // Fetch jobs by IDs
      const jobs = await Promise.all(
        ids.map(id => storage.getJob(id))
      );
      const validJobs = jobs.filter((j): j is NonNullable<typeof j> => j !== undefined);

      // Fetch builders for enrichment (for builderName)
      const builderIds = Array.from(new Set(validJobs.map(j => j.builderId).filter(Boolean)));
      const builders = await Promise.all(
        builderIds.map(id => storage.getBuilder(id))
      );
      const builderMap = new Map(builders.filter(Boolean).map(b => [b!.id, b!]));

      if (format === 'json') {
        // Return JSON directly
        res.json(validJobs);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row
          'ID,Name,Address,Contractor,Status,Priority,Builder ID,Builder Name,Scheduled Date,Completed Date,Completed Items,Total Items,Inspection Type,Compliance Status,Notes'
        ];

        // Data rows
        for (const job of validJobs) {
          const builder = job.builderId ? builderMap.get(job.builderId) : undefined;
          const builderName = builder?.name ?? '';

          const row = [
            job.id,
            job.name,
            job.address ?? '',
            job.contractor ?? '',
            job.status ?? '',
            job.priority ?? '',
            job.builderId ?? '',
            builderName,
            job.scheduledDate ? new Date(job.scheduledDate).toISOString() : '',
            job.completedDate ? new Date(job.completedDate).toISOString() : '',
            job.completedItems ?? '',
            job.totalItems ?? '',
            job.inspectionType ?? '',
            job.complianceStatus ?? '',
            job.notes ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="jobs-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export jobs');
      res.status(status).json({ message });
    }
  });

  // Create job from Google Calendar event
  app.post("/api/jobs/from-event", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const schema = z.object({
      eventId: z.string().min(1, "Event ID is required"),
    });

    try {
      const { eventId } = schema.parse(req.body);
      
      // Fetch the Google event
      const googleEvent = await storage.getGoogleEvent(eventId);
      if (!googleEvent) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      if (googleEvent.isConverted) {
        return res.status(400).json({ message: "This calendar event has already been converted to a job" });
      }

      // Check for existing job with same sourceGoogleEventId to prevent duplicates
      const existingJob = await storage.getJobBySourceEventId(googleEvent.id);
      if (existingJob) {
        return res.status(409).json({
          message: "Job already created from this event",
          job: existingJob
        });
      }

      // Import utilities from shared/jobNameGenerator.ts
      const { detectInspectionTypeFromTitle, generateJobName } = await import("@shared/jobNameGenerator");

      // Detect inspection type from event title
      const inspectionType = detectInspectionTypeFromTitle(googleEvent.title) || "Other";

      // Generate job name using event date and location
      const jobName = generateJobName(
        googleEvent.startTime,
        inspectionType,
        googleEvent.location || "No location"
      );

      // Create the job
      const newJob = await storage.createJob({
        name: jobName,
        address: googleEvent.location || "",
        contractor: "To be assigned",
        status: "scheduled",
        inspectionType: inspectionType,
        scheduledDate: googleEvent.startTime,
        priority: "medium",
        sourceGoogleEventId: googleEvent.id,
        originalScheduledDate: googleEvent.startTime,
        notes: googleEvent.description || "",
      });

      // Mark the Google event as converted
      await storage.markGoogleEventAsConverted(googleEvent.id, newJob.id);

      res.status(201).json(newJob);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('CreateJobFromEvent', error);
      res.status(500).json({ message: "Failed to create job from calendar event" });
    }
  });

  // Get today's unconverted Google calendar events
  app.get("/api/google-events/today", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getTodaysUnconvertedGoogleEvents();
      res.json(events);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch today\'s Google events');
      res.status(status).json({ message });
    }
  });

  // Get today's in-progress/scheduled jobs
  app.get("/api/jobs/today", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getTodaysJobsByStatus(['scheduled', 'in-progress', 'pre-inspection', 'testing', 'review']);
      res.json(jobs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch today\'s jobs');
      res.status(status).json({ message });
    }
  });

  // Get today's completed jobs
  app.get("/api/jobs/completed-today", isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getTodaysJobsByStatus(['completed']);
      res.json(jobs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch completed jobs');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events", isAuthenticated, async (req, res) => {
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

      res.status(400).json({ message: "Please provide either a job ID or date range to view schedule events" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch schedule events');
      res.status(status).json({ message });
    }
  });

  app.get("/api/google-events", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate are required' });
      }
      
      const events = await storage.getGoogleEventsByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(events);
    } catch (error: any) {
      serverLogger.error('[API] Error fetching Google events:', error);
      res.status(500).json({ message: 'Failed to fetch Google events', error: error.message });
    }
  });

  // Convert Google event to job
  app.post('/api/google-events/:id/convert', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { jobData, scheduleData, keepSynced } = req.body;
      
      // Get the Google event
      const googleEvent = await storage.getGoogleEvent(id);
      if (!googleEvent) {
        return res.status(404).json({ message: 'Google event not found' });
      }
      
      if (googleEvent.isConverted) {
        return res.status(400).json({ message: 'Event has already been converted to a job' });
      }
      
      // Create the job
      const job = await storage.createJob({
        ...jobData,
        status: jobData.status || 'scheduled',
        priority: jobData.priority || 'medium',
      });
      
      // Create the schedule event
      const scheduleEvent = await storage.createScheduleEvent({
        jobId: job.id,
        title: job.name,
        startTime: new Date(scheduleData.startTime),
        endTime: new Date(scheduleData.endTime),
        notes: jobData.notes || null,
        googleCalendarEventId: googleEvent.googleEventId,
        googleCalendarId: googleEvent.googleCalendarId,
        color: null,
      });
      
      // Mark Google event as converted
      await storage.markGoogleEventAsConverted(id, job.id);
      
      // If keepSynced, update Google Calendar event with jobId in extendedProperties
      if (keepSynced) {
        try {
          const calendar = await getUncachableGoogleCalendarClient();
          
          await calendar.events.patch({
            calendarId: googleEvent.googleCalendarId,
            eventId: googleEvent.googleEventId,
            requestBody: {
              extendedProperties: {
                private: {
                  scheduleEventId: scheduleEvent.id,
                  jobId: job.id,
                },
              },
            },
          });
          
          serverLogger.info(`[GoogleCalendar] Updated event ${googleEvent.googleEventId} with jobId ${job.id}`);
        } catch (error) {
          serverLogger.error('[GoogleCalendar] Error updating event in Google Calendar:', error);
          // Don't fail the conversion if Google update fails
        }
      }
      
      serverLogger.info(`[API] Converted Google event ${id} to job ${job.id}`);
      
      res.json({ 
        success: true,
        job,
        scheduleEvent,
      });
    } catch (error: any) {
      serverLogger.error('[API] Error converting Google event to job:', error);
      res.status(500).json({ message: 'Failed to convert event to job', error: error.message });
    }
  });

  app.get("/api/schedule-events/sync", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Please provide both start date and end date to sync events" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Fetch enabled calendars from preferences
      const preferences = await storage.getCalendarPreferences();
      const enabledCalendarIds = preferences
        .filter(p => p.isEnabled)
        .map(p => p.calendarId);
      
      // If no calendars enabled, default to primary
      const calendarIds = enabledCalendarIds.length > 0 ? enabledCalendarIds : ['primary'];
      
      serverLogger.info(`[ScheduleEvents/Sync] Syncing from ${calendarIds.length} calendars: ${calendarIds.join(', ')}`);
      
      const googleEvents = await googleCalendarService.fetchEventsFromGoogle(start, end, calendarIds);
      const syncedCount = { 
        scheduleEvents: { created: 0, updated: 0, skipped: 0 },
        googleEvents: { created: 0, updated: 0 },
      };
      
      // Create a map of Google event IDs for quick lookup
      const googleEventIdMap = new Map<string, any>();
      
      for (const googleEvent of googleEvents) {
        if (googleEvent.id) {
          googleEventIdMap.set(googleEvent.id, googleEvent);
        }
        
        const parsedEvent = googleCalendarService.parseGoogleEventToScheduleEvent(googleEvent);
        
        if (parsedEvent && parsedEvent.jobId) {
          // Event linked to job → ScheduleEvent
          const existingEvent = parsedEvent.id 
            ? await storage.getScheduleEvent(parsedEvent.id)
            : null;

          if (existingEvent) {
            await storage.updateScheduleEvent(existingEvent.id, {
              title: parsedEvent.title,
              startTime: parsedEvent.startTime,
              endTime: parsedEvent.endTime,
              notes: parsedEvent.notes,
              googleCalendarEventId: parsedEvent.googleCalendarEventId,
              googleCalendarId: parsedEvent.googleCalendarId,
              lastSyncedAt: parsedEvent.lastSyncedAt,
            });
            syncedCount.scheduleEvents.updated++;
          } else {
            const job = await storage.getJob(parsedEvent.jobId);
            if (job) {
              await storage.createScheduleEvent({
                jobId: parsedEvent.jobId,
                title: parsedEvent.title!,
                startTime: parsedEvent.startTime!,
                endTime: parsedEvent.endTime!,
                notes: parsedEvent.notes,
                googleCalendarEventId: parsedEvent.googleCalendarEventId,
                googleCalendarId: parsedEvent.googleCalendarId,
                color: parsedEvent.color,
              });
              syncedCount.scheduleEvents.created++;
            } else {
              syncedCount.scheduleEvents.skipped++;
            }
          }
        } else {
          // Event not linked to job → GoogleEvent
          if (!googleEvent.id) {
            continue;
          }

          // Get start and end times (support both timed and all-day events)
          // For all-day events, convert from Central Time to UTC with proper DST handling
          const startTime = googleEvent.start?.dateTime 
            ? new Date(googleEvent.start.dateTime)
            : googleEvent.start?.date
            ? allDayDateToUTC(googleEvent.start.date)
            : null;

          const endTime = googleEvent.end?.dateTime
            ? new Date(googleEvent.end.dateTime)
            : googleEvent.end?.date
            ? allDayDateToUTC(googleEvent.end.date)
            : null;

          if (!startTime || !endTime) {
            serverLogger.warn(`[ScheduleSync] Skipping event ${googleEvent.id} - missing start or end time`);
            continue;
          }

          const calendarId = googleEvent.organizer?.email || 'primary';
          const existingGoogleEvent = await storage.getGoogleEventByGoogleId(googleEvent.id, calendarId);

          if (existingGoogleEvent) {
            await storage.updateGoogleEvent(existingGoogleEvent.id, {
              title: googleEvent.summary || 'Untitled',
              description: googleEvent.description || null,
              location: googleEvent.location || null,
              startTime,
              endTime,
              colorId: googleEvent.colorId || null,
              lastSyncedAt: new Date(),
            });
            syncedCount.googleEvents.updated++;
          } else {
            await storage.createGoogleEvent({
              googleEventId: googleEvent.id,
              googleCalendarId: calendarId,
              title: googleEvent.summary || 'Untitled',
              description: googleEvent.description || null,
              location: googleEvent.location || null,
              startTime,
              endTime,
              colorId: googleEvent.colorId || null,
              isConverted: false,
              convertedToJobId: null,
              lastSyncedAt: new Date(),
            });
            syncedCount.googleEvents.created++;
          }
        }
      }
      
      // Calendar sync intelligence: detect cancelled and rescheduled jobs
      const syncIntelligence = {
        cancelled: 0,
        rescheduled: 0,
        completedButRescheduled: 0,
      };
      
      try {
        // Get all jobs with sourceGoogleEventId in the date range
        const allJobs = await storage.getAllJobs();
        const jobsWithSourceEvent = allJobs.filter(job => 
          job.sourceGoogleEventId && 
          job.scheduledDate && 
          job.scheduledDate >= start && 
          job.scheduledDate <= end
        );
        
        for (const job of jobsWithSourceEvent) {
          const googleEvent = googleEventIdMap.get(job.sourceGoogleEventId!);
          
          if (!googleEvent) {
            // Event no longer exists in Google Calendar → mark as cancelled
            // Log details before marking to help diagnose false positives
            if (!job.isCancelled) {
              serverLogger.warn(`[CalendarSync] Job ${job.id} "${job.name}" source event ${job.sourceGoogleEventId} not found in calendars: ${calendarIds.join(', ')}`);
              serverLogger.warn(`[CalendarSync] Marking job ${job.id} as cancelled. Job scheduled: ${job.scheduledDate}`);
              await storage.updateJob(job.id, { isCancelled: true });
              syncIntelligence.cancelled++;
            }
          } else {
            // Event exists → check for rescheduling
            // Get start time (support both timed and all-day events)
            // For all-day events, convert from Central Time to UTC with proper DST handling
            const googleEventStartTime = googleEvent.start?.dateTime 
              ? new Date(googleEvent.start.dateTime)
              : googleEvent.start?.date
              ? allDayDateToUTC(googleEvent.start.date)
              : null;
            
            if (!googleEventStartTime) {
              serverLogger.error(`[CalendarSync] Event ${job.sourceGoogleEventId} has no start time`);
              continue;
            }
            
            const jobScheduledDate = new Date(job.scheduledDate);
            
            // Compare dates (ignore milliseconds)
            const timeDiffMs = Math.abs(googleEventStartTime.getTime() - jobScheduledDate.getTime());
            const isRescheduled = timeDiffMs > 60000; // More than 1 minute difference
            
            if (isRescheduled) {
              const updates: Partial<InsertJob> = {};
              
              // Set originalScheduledDate if not already set
              if (!job.originalScheduledDate) {
                updates.originalScheduledDate = jobScheduledDate;
              }
              
              // Update scheduledDate to match Google Calendar
              updates.scheduledDate = googleEventStartTime;
              
              // If job is already completed, log warning
              if (job.status === 'completed') {
                serverLogger.warn(`[CalendarSync] Job ${job.id} is completed but event was rescheduled from ${jobScheduledDate.toISOString()} to ${googleEventStartTime.toISOString()}`);
                syncIntelligence.completedButRescheduled++;
              } else {
                syncIntelligence.rescheduled++;
              }
              
              await storage.updateJob(job.id, updates);
              serverLogger.info(`[CalendarSync] Updated job ${job.id} schedule: ${jobScheduledDate.toISOString()} → ${googleEventStartTime.toISOString()}`);
            }
            
            // Unmark as cancelled if it was previously cancelled
            if (job.isCancelled) {
              await storage.updateJob(job.id, { isCancelled: false });
              serverLogger.info(`[CalendarSync] Unmarked job ${job.id} as cancelled (event ${job.sourceGoogleEventId} found again)`);
            }
          }
        }
      } catch (error) {
        serverLogger.error('[CalendarSync] Error during calendar sync intelligence:', error);
        // Don't fail the entire sync if intelligence fails
      }

      res.json({
        message: "Sync completed successfully",
        syncedCount,
        syncIntelligence,
        totalProcessed: googleEvents.length,
      });
    } catch (error: any) {
      logError('ScheduleEvents/Sync', error, { startDate, endDate });
      
      // Check if this is an authentication error
      const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
                         error.message?.toLowerCase().includes('authentication') ||
                         error.message?.toLowerCase().includes('invalid credentials') ||
                         error.message?.toLowerCase().includes('not connected') ||
                         error.code === 401 ||
                         error.status === 401;
      
      if (isAuthError) {
        return res.status(401).json({ 
          message: 'Google Calendar authentication required. Please log out and reconnect your Google account in Settings.',
        });
      }
      
      const { status, message } = handleDatabaseError(error, 'sync schedule events from Google Calendar');
      res.status(status).json({ message });
    }
  });

  app.post("/api/schedule-events", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.parse(req.body);
      const event = await storage.createScheduleEvent(validated);
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const calendarId = event.googleCalendarId || 'primary';
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job, calendarId);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              googleCalendarId: calendarId,
              lastSyncedAt: new Date(),
            });
            return res.status(201).json(updatedEvent || event);
          }
        }
      } catch (syncError) {
        logError('ScheduleEvents/GoogleSync', syncError, { eventId: event.id });
      }
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create schedule event');
      res.status(status).json({ message });
    }
  });

  app.get("/api/schedule-events/:id", isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found. It may have been deleted." });
      }
      res.json(event);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch schedule event');
      res.status(status).json({ message });
    }
  });

  app.put("/api/schedule-events/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertScheduleEventSchema.partial().parse(req.body);
      const event = await storage.updateScheduleEvent(req.params.id, validated);
      if (!event) {
        return res.status(404).json({ message: "Schedule event not found. It may have been deleted." });
      }
      
      try {
        const job = await storage.getJob(event.jobId);
        if (job) {
          const calendarId = event.googleCalendarId || 'primary';
          const googleEventId = await googleCalendarService.syncEventToGoogle(event, job, calendarId);
          if (googleEventId) {
            const updatedEvent = await storage.updateScheduleEvent(event.id, {
              googleCalendarEventId: googleEventId,
              googleCalendarId: calendarId,
              lastSyncedAt: new Date(),
            });
            return res.json(updatedEvent || event);
          }
        }
      } catch (syncError) {
        logError('ScheduleEvents/GoogleSync', syncError, { eventId: event.id });
      }
      
      res.json(event);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update schedule event');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/schedule-events/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const event = await storage.getScheduleEvent(req.params.id);
      
      if (event?.googleCalendarEventId) {
        try {
          const calendarId = event.googleCalendarId || 'primary';
          await googleCalendarService.deleteEventFromGoogle(event.googleCalendarEventId, calendarId);
        } catch (syncError) {
          logError('ScheduleEvents/GoogleSync', syncError, { eventId: req.params.id });
        }
      }
      
      const deleted = await storage.deleteScheduleEvent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Schedule event not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete schedule event');
      res.status(status).json({ message });
    }
  });

  app.get("/api/expenses", isAuthenticated, async (req, res) => {
    try {
      const { jobId, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        let result;
        
        if (jobId && typeof jobId === "string") {
          result = await storage.getExpensesByJobPaginated(jobId, params);
        } else {
          result = await storage.getExpensesPaginated(params);
        }
        
        return res.json(result);
      }

      let expenses;
      if (jobId && typeof jobId === "string") {
        expenses = await storage.getExpensesByJob(jobId);
      } else {
        expenses = await storage.getAllExpenses();
      }

      res.json(expenses);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch expenses');
      res.status(status).json({ message });
    }
  });

  app.post("/api/expenses", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create expense');
      res.status(status).json({ message });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found. It may have been deleted." });
      }
      res.json(expense);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch expense');
      res.status(status).json({ message });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, validated);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found. It may have been deleted." });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update expense');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete expense');
      res.status(status).json({ message });
    }
  });

  // Bulk delete expenses
  app.delete("/api/expenses/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one expense ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 expenses at once" });
      }

      const deleted = await storage.bulkDeleteExpenses(ids);
      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete expenses');
      res.status(status).json({ message });
    }
  });

  // Export expenses
  app.post("/api/expenses/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one expense ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 expenses at once" });
      }

      // Fetch expenses by IDs
      const expenses = await Promise.all(
        ids.map(id => storage.getExpense(id))
      );
      const validExpenses = expenses.filter((e): e is NonNullable<typeof e> => e !== undefined);

      // Fetch jobs for enrichment (for job names in export)
      const jobIds = Array.from(new Set(validExpenses.map(e => e.jobId).filter(Boolean)));
      const jobs = await Promise.all(
        jobIds.map(id => storage.getJob(id))
      );
      const jobMap = new Map(jobs.filter(Boolean).map(j => [j!.id, j!]));

      if (format === 'json') {
        // Return JSON directly
        res.json(validExpenses);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row - accounting-friendly format
          'ID,Date,Category,Amount,Description,Type,Job ID,Job Name,Receipt URL'
        ];

        // Data rows
        for (const expense of validExpenses) {
          const job = expense.jobId ? jobMap.get(expense.jobId) : undefined;
          const jobName = job?.name ?? '';
          const expenseType = expense.isWorkRelated ? 'Work' : 'Personal';

          const row = [
            expense.id,
            expense.date ? new Date(expense.date).toISOString().split('T')[0] : '', // YYYY-MM-DD format
            expense.category ?? '',
            expense.amount ?? '',
            expense.description ?? '',
            expenseType,
            expense.jobId ?? '',
            jobName,
            expense.receiptUrl ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="expenses-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export expenses');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, limit, offset } = req.query;

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = await storage.getMileageLogsPaginated(params);
        return res.json(result);
      }

      let logs;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        logs = await storage.getMileageLogsByDateRange(start, end);
      } else {
        logs = await storage.getAllMileageLogs();
      }

      res.json(logs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch mileage logs');
      res.status(status).json({ message });
    }
  });

  app.post("/api/mileage-logs", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.parse(req.body);
      const log = await storage.createMileageLog(validated);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/mileage-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const log = await storage.getMileageLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found. It may have been deleted." });
      }
      res.json(log);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch mileage log');
      res.status(status).json({ message });
    }
  });

  app.put("/api/mileage-logs/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertMileageLogSchema.partial().parse(req.body);
      const log = await storage.updateMileageLog(req.params.id, validated);
      if (!log) {
        return res.status(404).json({ message: "Mileage log not found. It may have been deleted." });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update mileage log');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/mileage-logs/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteMileageLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Mileage log not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete mileage log');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = await storage.getAllReportTemplates();
      res.json(templates);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report templates');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-templates", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.parse(req.body);
      const template = await storage.createReportTemplate(validated);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create report template');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Report template not found. It may have been deleted." });
      }
      res.json(template);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report template');
      res.status(status).json({ message });
    }
  });

  app.put("/api/report-templates/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertReportTemplateSchema.partial().parse(req.body);
      const template = await storage.updateReportTemplate(req.params.id, validated);
      if (!template) {
        return res.status(404).json({ message: "Report template not found. It may have been deleted." });
      }
      res.json(template);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update report template');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/report-templates/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteReportTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Report template not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete report template');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-instances", isAuthenticated, async (req, res) => {
    try {
      const { jobId, limit, offset } = req.query;

      let instances;
      if (jobId && typeof jobId === "string") {
        instances = await storage.getReportInstancesByJob(jobId);
      } else {
        instances = await storage.getAllReportInstances();
      }

      const withScores = instances.map(inst => ({
        ...inst,
        scoreSummary: inst.scoreSummary ? JSON.parse(inst.scoreSummary) : null,
      }));

      if (limit !== undefined || offset !== undefined) {
        const params = paginationParamsSchema.parse({ limit, offset });
        const result = createPaginatedResult(withScores, params);
        return res.json(result);
      }

      res.json(withScores);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch report instances');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const validated = insertReportInstanceSchema.parse(req.body);
      const instance = await storage.createReportInstance(validated);
      
      // Trigger compliance evaluation for both job and report
      try {
        await updateJobComplianceStatus(storage, instance.jobId);
        await updateReportComplianceStatus(storage, instance.id);
      } catch (error) {
        logError('ReportInstances/ComplianceEvaluation', error, { instanceId: instance.id });
      }
      
      // Audit log: Report generation
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'report.generate',
        resourceType: 'report',
        resourceId: instance.id,
        metadata: { jobId: instance.jobId, templateId: instance.templateId },
      }, storage);
      
      res.status(201).json(instance);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create report instance');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances/recalculate-scores", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const jobs = await storage.getAllJobs();
      let recalculated = 0;
      
      for (const job of jobs) {
        const instances = await storage.getReportInstancesByJob(job.id);
        for (const instance of instances) {
          await storage.recalculateReportScore(instance.id);
          recalculated++;
        }
      }
      
      res.json({ message: `Recalculated scores for ${recalculated} report instances` });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'recalculate report scores');
      res.status(status).json({ message });
    }
  });

  app.get("/api/report-instances/:id", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found. It may have been deleted." });
      }
      
      const job = await storage.getJob(instance.jobId);
      const builder = job?.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = await storage.getChecklistItemsByJob(instance.jobId);
      
      res.json({
        ...instance,
        job,
        builder,
        checklistItems,
      });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch report instance');
      res.status(status).json({ message });
    }
  });

  app.put("/api/report-instances/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertReportInstanceSchema.partial().parse(req.body);
      const instance = await storage.updateReportInstance(req.params.id, validated);
      if (!instance) {
        return res.status(404).json({ message: "Report instance not found. It may have been deleted." });
      }
      res.json(instance);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update report instance');
      res.status(status).json({ message });
    }
  });

  app.post("/api/report-instances/:id/generate-pdf", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // Fetch report instance
      const reportInstance = await storage.getReportInstance(req.params.id);
      if (!reportInstance) {
        return res.status(404).json({ message: "Report instance not found" });
      }

      // Fetch related data
      const job = await storage.getJob(reportInstance.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const builder = job.builderId ? await storage.getBuilder(job.builderId) : undefined;
      const checklistItems = await storage.getChecklistItemsByJob(reportInstance.jobId);
      const photos = await storage.getPhotosByJob(reportInstance.jobId);
      const forecasts = await storage.getForecastsByJob(reportInstance.jobId);

      // Parse template sections
      const template = await storage.getReportTemplate(reportInstance.templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const templateSections = JSON.parse(template.sections);

      // Generate PDF
      const pdfBuffer = await generateReportPDF({
        reportInstance,
        job,
        builder,
        checklistItems,
        photos,
        forecasts,
        templateSections,
      });

      // Upload PDF to object storage
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      
      // Create a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `report-${reportInstance.id}-${timestamp}.pdf`;
      const objectPath = `${privateDir}/reports/${filename}`;

      // Parse the object path to get bucket and object name
      const pathParts = objectPath.split('/');
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join('/');

      // Upload the PDF buffer
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
        },
      });

      // Set ACL to private
      await objectStorageService.trySetObjectEntityAclPolicy(
        `/objects/reports/${filename}`,
        {
          owner: userId || "unknown",
          visibility: "private",
        }
      );

      // Update report instance with PDF URL (normalized path)
      const normalizedPath = `/objects/reports/${filename}`;
      await storage.updateReportInstance(req.params.id, {
        pdfUrl: normalizedPath,
      });

      res.json({
        success: true,
        pdfUrl: normalizedPath,
      });
    } catch (error) {
      logError('ReportInstances/GeneratePDF', error, { reportId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'generate PDF report');
      res.status(status).json({ message });
    }
  });

  // PDF Download endpoint
  app.get("/api/report-instances/:id/download-pdf", isAuthenticated, async (req, res) => {
    try {
      const instance = await storage.getReportInstance(req.params.id);
      if (!instance || !instance.pdfUrl) {
        return res.status(404).json({ message: "PDF not found. Please generate the PDF first." });
      }

      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(instance.pdfUrl);
      
      if (!file) {
        return res.status(404).json({ message: "PDF file not found in storage. It may have been deleted." });
      }

      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      logError('ReportInstances/DownloadPDF', error, { reportId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'download PDF report');
      res.status(status).json({ message });
    }
  });

  // Object Storage Routes
  app.post("/api/objects/upload", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL, objectPath });
    } catch (error) {
      logError('ObjectStorage/Upload', error);
      const { status, message } = handleDatabaseError(error, 'get upload URL');
      res.status(status).json({ message });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      logError('ObjectStorage/Access', error, { path: req.path, userId });
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Signature Routes
  app.post("/api/jobs/:id/signature", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { signatureUrl, signerName, signerRole } = req.body;

      if (!signatureUrl || !signerName) {
        return res.status(400).json({ message: "Please provide both signature and signer name" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the signature path (handles both presigned HTTPS URLs and relative paths)
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(signatureUrl);
      
      // Validate that normalization was successful
      if (!normalizedPath || !normalizedPath.startsWith("/")) {
        return res.status(400).json({ 
          message: "Invalid signature format. Please try again." 
        });
      }
      
      // Wait for the file to exist before setting ACL
      const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
      if (!fileExists) {
        return res.status(400).json({ 
          message: "Signature upload not complete. Please ensure the signature was uploaded successfully." 
        });
      }
      
      // Set the ACL policy to private (signatures should be secure)
      // Use normalizedPath instead of raw signatureUrl
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        normalizedPath,
        {
          owner: userId || "unknown",
          visibility: "private",
        },
      );

      // Update the job with signature data and server-side timestamp
      const job = await storage.updateJob(req.params.id, {
        builderSignatureUrl: objectPath,
        builderSignerName: signerName,
        builderSignedAt: new Date(),
      });

      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      res.json(job);
    } catch (error) {
      logError('Signature/Save', error, { jobId: req.params.id });
      const { status, message } = handleDatabaseError(error, 'save signature');
      res.status(status).json({ message });
    }
  });

  // Photo Routes
  app.get("/api/photos", isAuthenticated, async (req, res) => {
    try {
      const { jobId, checklistItemId, tags, dateFrom, dateTo, limit, offset, cursor, sortOrder } = req.query;

      // Parse tags - can be single value, comma-separated, or array
      let parsedTags: string[] | undefined;
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags.filter((t): t is string => typeof t === 'string');
        } else if (typeof tags === 'string') {
          parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }
      }

      // Build filters object
      const filters = {
        jobId: typeof jobId === 'string' ? jobId : undefined,
        checklistItemId: typeof checklistItemId === 'string' ? checklistItemId : undefined,
        tags: parsedTags,
        dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
        dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      };

      // Determine pagination mode: cursor-based (new) or offset-based (legacy)
      const useCursorPagination = cursor !== undefined || sortOrder !== undefined;

      if (useCursorPagination) {
        // New cursor-based pagination
        const params = photoCursorPaginationParamsSchema.parse({ cursor, limit, sortOrder });
        const result = await storage.getPhotosCursorPaginated(filters, params);
        return res.json(result);
      }

      if (limit !== undefined || offset !== undefined) {
        // Legacy offset-based pagination
        const params = paginationParamsSchema.parse({ limit, offset });
        
        const hasFilters = jobId || checklistItemId || parsedTags || dateFrom || dateTo;
        
        let result;
        if (hasFilters) {
          result = await storage.getPhotosFilteredPaginated(filters, params);
        } else {
          result = await storage.getPhotosPaginated(params);
        }
        
        return res.json(result);
      }

      let photos;
      if (checklistItemId && typeof checklistItemId === "string") {
        photos = await storage.getPhotosByChecklistItem(checklistItemId);
      } else if (jobId && typeof jobId === "string") {
        photos = await storage.getPhotosByJob(jobId);
      } else {
        photos = await storage.getAllPhotos();
      }

      res.json(photos);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'fetch photos');
      res.status(status).json({ message });
    }
  });

  app.post("/api/photos", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!req.body.filePath) {
        return res.status(400).json({ message: "Please provide a file path for the photo" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path first
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.filePath);
      
      // Wait for the file to exist before setting ACL (uploaded files may take a moment to appear)
      if (normalizedPath.startsWith("/")) {
        const fileExists = await objectStorageService.waitForObjectEntity(normalizedPath, 10, 500);
        if (!fileExists) {
          return res.status(400).json({ 
            message: "Photo upload not complete. Please ensure the file was uploaded successfully." 
          });
        }
      }
      
      // Now that we've confirmed the file exists, set the ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.filePath,
        {
          owner: userId || "unknown",
          visibility: "public",
        },
      );

      const validated = insertPhotoSchema.parse({
        ...req.body,
        filePath: objectPath,
      });
      const photo = await storage.createPhoto(validated);
      
      if (photo.checklistItemId) {
        const checklistItem = await storage.getChecklistItem(photo.checklistItemId);
        if (checklistItem) {
          await storage.updateChecklistItem(photo.checklistItemId, {
            photoCount: (checklistItem.photoCount || 0) + 1,
          });
        }
      }
      
      // Trigger async thumbnail generation without blocking response
      setImmediate(async () => {
        try {
          serverLogger.info(`[Photos/Create] Starting async thumbnail generation for photo ${photo.id}`);
          const thumbnailPath = await generateThumbnail(objectPath);
          
          // Update photo record with thumbnail path
          await storage.updatePhoto(photo.id, { thumbnailPath });
          serverLogger.info(`[Photos/Create] Thumbnail generated and saved for photo ${photo.id}`);
        } catch (thumbnailError) {
          // Log error but don't fail the upload
          serverLogger.error(`[Photos/Create] Failed to generate thumbnail for photo ${photo.id}:`, thumbnailError);
        }
      });
      
      res.status(201).json(photo);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Photos/Create', error, { filePath: req.body.filePath });
      const { status, message } = handleDatabaseError(error, 'create photo');
      res.status(status).json({ message });
    }
  });

  app.get("/api/photos/:id", isAuthenticated, async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have been deleted." });
      }
      res.json(photo);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch photo');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/photos/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertPhotoSchema.partial().parse(req.body);
      const photo = await storage.updatePhoto(req.params.id, validated);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have been deleted." });
      }
      res.json(photo);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update photo');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/photos/:id", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found. It may have already been deleted." });
      }
      
      if (photo.checklistItemId) {
        const checklistItem = await storage.getChecklistItem(photo.checklistItemId);
        if (checklistItem && checklistItem.photoCount !== null && checklistItem.photoCount > 0) {
          await storage.updateChecklistItem(photo.checklistItemId, {
            photoCount: checklistItem.photoCount - 1,
          });
        }
      }
      
      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found. It may have already been deleted." });
      }
      
      // Audit log: Photo deletion
      await createAuditLog(req, {
        userId: req.user.claims.sub,
        action: 'photo.delete',
        resourceType: 'photo',
        resourceId: req.params.id,
        metadata: { jobId: photo.jobId, filePath: photo.filePath },
      }, storage);
      
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete photo');
      res.status(status).json({ message });
    }
  });

  // Bulk delete photos
  app.delete("/api/photos/bulk", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkDeleteSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
    });

    try {
      const { ids } = bulkDeleteSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot delete more than 200 photos at once" });
      }

      // Fetch photos first to update checklist item counts
      const photos = await Promise.all(ids.map(id => storage.getPhoto(id)));
      const validPhotos = photos.filter((p): p is NonNullable<typeof p> => p !== undefined);

      // Track checklist items that need count updates
      const checklistUpdates = new Map<string, number>();
      
      for (const photo of validPhotos) {
        if (photo.checklistItemId) {
          const current = checklistUpdates.get(photo.checklistItemId) || 0;
          checklistUpdates.set(photo.checklistItemId, current + 1);
        }
      }

      // Delete photos
      const deleted = await storage.bulkDeletePhotos(ids);

      // Update checklist item photo counts
      for (const [checklistItemId, decrementBy] of checklistUpdates.entries()) {
        const checklistItem = await storage.getChecklistItem(checklistItemId);
        if (checklistItem && checklistItem.photoCount !== null && checklistItem.photoCount > 0) {
          await storage.updateChecklistItem(checklistItemId, {
            photoCount: Math.max(0, checklistItem.photoCount - decrementBy),
          });
        }
      }

      res.json({ deleted, total: ids.length });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk delete photos');
      res.status(status).json({ message });
    }
  });

  // Bulk tag photos
  app.post("/api/photos/bulk-tag", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const bulkTagSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      mode: z.enum(['add', 'remove', 'replace']),
      tags: z.array(z.string()).min(1, "At least one tag is required"),
    });

    try {
      const { ids, mode, tags } = bulkTagSchema.parse(req.body);
      
      // Limit bulk operations to 200 items for safety
      if (ids.length > 200) {
        return res.status(400).json({ message: "Cannot tag more than 200 photos at once" });
      }

      const updated = await storage.bulkUpdatePhotoTags(ids, mode, tags);
      res.json({ updated, total: ids.length, mode, tags });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'bulk tag photos');
      res.status(status).json({ message });
    }
  });

  // Export photos
  app.post("/api/photos/export", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const exportSchema = z.object({
      ids: z.array(z.string()).min(1, "At least one photo ID is required"),
      format: z.enum(['csv', 'json']),
    });

    try {
      const { ids, format } = exportSchema.parse(req.body);
      
      // Limit export to 1000 items for safety
      if (ids.length > 1000) {
        return res.status(400).json({ message: "Cannot export more than 1000 photos at once" });
      }

      // Fetch photos by IDs
      const photos = await Promise.all(
        ids.map(id => storage.getPhoto(id))
      );
      const validPhotos = photos.filter((p): p is NonNullable<typeof p> => p !== undefined);

      if (format === 'json') {
        // Return JSON directly
        res.json(validPhotos);
      } else {
        // Generate CSV
        const csvRows: string[] = [
          // Header row
          'ID,Job ID,Job Name,Checklist Item ID,Tags,Uploaded At,File Path,Full URL'
        ];

        // Data rows
        for (const photo of validPhotos) {
          // Get job name if jobId exists
          let jobName = '';
          if (photo.jobId) {
            const job = await storage.getJob(photo.jobId);
            jobName = job?.name ?? '';
          }

          const row = [
            photo.id,
            photo.jobId ?? '',
            jobName,
            photo.checklistItemId ?? '',
            (photo.tags ?? []).join(';'),
            photo.uploadedAt,
            photo.filePath ?? '',
            photo.fullUrl ?? '',
          ].map(field => {
            // Escape commas and quotes in CSV
            const str = String(field);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');

          csvRows.push(row);
        }

        const csv = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="photos-export-${Date.now()}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'export photos');
      res.status(status).json({ message });
    }
  });

  app.get("/api/forecasts", isAuthenticated, async (req, res) => {
    try {
      const forecasts = await storage.getAllForecasts();
      res.json(forecasts);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch forecasts');
      res.status(status).json({ message });
    }
  });

  app.get("/api/forecasts/:id", isAuthenticated, async (req, res) => {
    try {
      const forecast = await storage.getForecast(req.params.id);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found. It may have been deleted." });
      }
      res.json(forecast);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch forecast');
      res.status(status).json({ message });
    }
  });

  app.post("/api/forecasts", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertForecastSchema.parse(req.body);
      const forecast = await storage.createForecast(validated);
      
      // Trigger compliance evaluation if actual values are being updated
      if (validated.actualTDL !== undefined || validated.actualDLO !== undefined || validated.actualACH50 !== undefined) {
        try {
          await updateJobComplianceStatus(storage, forecast.jobId);
        } catch (error) {
          logError('Forecasts/ComplianceEvaluation', error, { forecastId: forecast.id });
        }
      }
      
      res.status(201).json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create forecast');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/forecasts/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertForecastSchema.partial().parse(req.body);
      const forecast = await storage.updateForecast(req.params.id, validated);
      if (!forecast) {
        return res.status(404).json({ message: "Forecast not found. It may have been deleted." });
      }
      
      // Trigger compliance evaluation if actual values are being updated
      if (validated.actualTDL !== undefined || validated.actualDLO !== undefined || validated.actualACH50 !== undefined) {
        try {
          await updateJobComplianceStatus(storage, forecast.jobId);
        } catch (error) {
          logError('Forecasts/ComplianceEvaluation', error, { forecastId: forecast.id });
        }
      }
      
      res.json(forecast);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update forecast');
      res.status(status).json({ message });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getBuilderLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder leaderboard');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/export", isAuthenticated, async (req, res) => {
    try {
      const [summary, leaderboard] = await Promise.all([
        storage.getDashboardSummary(),
        storage.getBuilderLeaderboard(),
      ]);

      const { generateDashboardPDF } = await import('./pdfGenerator.tsx');
      const pdfBuffer = await generateDashboardPDF({
        summary,
        leaderboard,
      });

      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-report-${dateStr}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      logError('Dashboard/ExportPDF', error);
      res.status(500).json({ message: "We're having trouble generating the PDF. Please try again." });
    }
  });

  app.post("/api/dashboard/export/email", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    const emailSchema = z.object({
      emails: z.array(z.string().email()).min(1, "At least one email address is required"),
    });

    try {
      const { emails } = emailSchema.parse(req.body);

      const [summary, leaderboard] = await Promise.all([
        storage.getDashboardSummary(),
        storage.getBuilderLeaderboard(),
      ]);

      const { generateDashboardPDF } = await import('./pdfGenerator.tsx');
      const pdfBuffer = await generateDashboardPDF({
        summary,
        leaderboard,
      });

      serverLogger.info('Dashboard PDF email requested', {
        recipients: emails,
        pdfSize: pdfBuffer.length,
      });

      res.json({ 
        message: `Dashboard report queued for delivery to ${emails.length} recipient${emails.length > 1 ? 's' : ''}`,
        recipients: emails 
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Dashboard/EmailPDF', error);
      res.status(500).json({ message: "We're having trouble sending the email. Please try again." });
    }
  });

  app.get("/api/checklist-items", isAuthenticated, async (req, res) => {
    try {
      const { jobId } = req.query;

      if (jobId && typeof jobId === "string") {
        const items = await storage.getChecklistItemsByJob(jobId);
        return res.json(items);
      }

      const jobs = await storage.getAllJobs();
      const allItems = [];
      for (const job of jobs) {
        const items = await storage.getChecklistItemsByJob(job.id);
        allItems.push(...items);
      }
      res.json(allItems);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch checklist items');
      res.status(status).json({ message });
    }
  });

  app.post("/api/checklist-items", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertChecklistItemSchema.parse(req.body);
      const item = await storage.createChecklistItem(validated);
      
      // Trigger compliance evaluation for all checklist item changes
      try {
        const reportInstances = await storage.getReportInstancesByJob(item.jobId);
        for (const reportInstance of reportInstances) {
          await updateReportComplianceStatus(storage, reportInstance.id);
        }
      } catch (error) {
        logError('ChecklistItems/ComplianceEvaluation', error, { itemId: item.id });
      }
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create checklist item');
      res.status(status).json({ message });
    }
  });

  app.get("/api/checklist-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getChecklistItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found. It may have been deleted." });
      }
      res.json(item);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch checklist item');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/checklist-items/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = updateChecklistItemSchema.parse(req.body);
      const item = await storage.updateChecklistItem(req.params.id, validated);
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found. It may have been deleted." });
      }
      
      // Trigger compliance evaluation for all checklist item changes
      try {
        const reportInstances = await storage.getReportInstancesByJob(item.jobId);
        for (const reportInstance of reportInstances) {
          await updateReportComplianceStatus(storage, reportInstance.id);
        }
      } catch (error) {
        logError('ChecklistItems/ComplianceEvaluation', error, { itemId: item.id });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update checklist item');
      res.status(status).json({ message });
    }
  });

  app.delete("/api/checklist-items/:id", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const deleted = await storage.deleteChecklistItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Checklist item not found. It may have already been deleted." });
      }
      res.status(204).send();
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'delete checklist item');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/jobs/:jobId", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      const evaluation = await evaluateJobCompliance(storage, req.params.jobId);
      res.json({
        jobId: req.params.jobId,
        ...evaluation,
      });
    } catch (error) {
      logError('Compliance/JobStatus', error, { jobId: req.params.jobId });
      const { status, message } = handleDatabaseError(error, 'fetch job compliance status');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/jobs/:jobId/evaluate", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const job = await storage.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found. It may have been deleted." });
      }

      const updatedJob = await updateJobComplianceStatus(storage, req.params.jobId);
      if (!updatedJob) {
        return res.status(500).json({ message: "Unable to evaluate job compliance. Please try again." });
      }

      res.json(updatedJob);
    } catch (error) {
      logError('Compliance/JobEvaluate', error, { jobId: req.params.jobId });
      const { status, message } = handleDatabaseError(error, 'evaluate job compliance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/reports/:reportId", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getReportInstance(req.params.reportId);
      if (!report) {
        return res.status(404).json({ message: "Report not found. It may have been deleted." });
      }

      const evaluation = await evaluateReportCompliance(storage, req.params.reportId);
      res.json({
        reportId: req.params.reportId,
        ...evaluation,
      });
    } catch (error) {
      logError('Compliance/ReportStatus', error, { reportId: req.params.reportId });
      const { status, message } = handleDatabaseError(error, 'fetch report compliance status');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/reports/:reportId/evaluate", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const report = await storage.getReportInstance(req.params.reportId);
      if (!report) {
        return res.status(404).json({ message: "Report not found. It may have been deleted." });
      }

      const updatedReport = await updateReportComplianceStatus(storage, req.params.reportId);
      if (!updatedReport) {
        return res.status(500).json({ message: "Unable to evaluate report compliance. Please try again." });
      }

      res.json(updatedReport);
    } catch (error) {
      logError('Compliance/ReportEvaluate', error, { reportId: req.params.reportId });
      const { status, message } = handleDatabaseError(error, 'evaluate report compliance');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/rules", isAuthenticated, async (_req, res) => {
    try {
      const rules = await storage.getComplianceRules();
      res.json(rules);
    } catch (error) {
      logError('Compliance/GetRules', error);
      const { status, message } = handleDatabaseError(error, 'fetch compliance rules');
      res.status(status).json({ message });
    }
  });

  app.post("/api/compliance/rules", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertComplianceRuleSchema.parse(req.body);
      const rule = await storage.createComplianceRule(validated);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('Compliance/CreateRule', error);
      const { status, message } = handleDatabaseError(error, 'create compliance rule');
      res.status(status).json({ message });
    }
  });

  app.get("/api/compliance/history/:entityType/:entityId", isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      
      if (entityType !== "job" && entityType !== "report") {
        return res.status(400).json({ message: "Please specify either 'job' or 'report' as the entity type" });
      }

      const history = await storage.getComplianceHistory(entityType, entityId);
      res.json(history);
    } catch (error) {
      logError('Compliance/History', error, { entityType: req.params.entityType, entityId: req.params.entityId });
      const { status, message } = handleDatabaseError(error, 'fetch compliance history');
      res.status(status).json({ message });
    }
  });

  // Google Calendar preferences
  app.get('/api/calendar-preferences', isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.getCalendarPreferences();
      res.json(preferences);
    } catch (error) {
      logError('CalendarPreferences/Get', error);
      const { status, message } = handleDatabaseError(error, 'fetch calendar preferences');
      res.status(status).json({ message });
    }
  });

  app.post('/api/calendar-preferences', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const preferencesData = z.array(insertCalendarPreferenceSchema).parse(req.body);
      const preferences = await storage.saveCalendarPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('CalendarPreferences/Save', error);
      const { status, message } = handleDatabaseError(error, 'save calendar preferences');
      res.status(status).json({ message });
    }
  });

  app.patch('/api/calendar-preferences/:calendarId/toggle', isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const { calendarId } = req.params;
      const { isEnabled } = z.object({ isEnabled: z.boolean() }).parse(req.body);
      
      const preference = await storage.updateCalendarToggle(calendarId, isEnabled);
      
      if (!preference) {
        return res.status(404).json({ message: 'Calendar preference not found. It may have been deleted.' });
      }
      
      res.json(preference);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      logError('CalendarPreferences/Toggle', error, { calendarId: req.params.calendarId });
      const { status, message } = handleDatabaseError(error, 'update calendar toggle');
      res.status(status).json({ message });
    }
  });

  // Fetch Google Calendar list (merged with user preferences)
  app.get('/api/google-calendars/list', isAuthenticated, async (req, res) => {
    try {
      // Fetch calendars from Google
      const googleCalendars = await googleCalendarService.fetchCalendarList();
      
      // Fetch user preferences
      const preferences = await storage.getCalendarPreferences();
      const prefsMap = new Map(preferences.map(p => [p.calendarId, p]));
      
      // Create preferences for new calendars that don't have them yet
      const newPreferences: typeof insertCalendarPreferenceSchema._type[] = [];
      for (const cal of googleCalendars) {
        if (!prefsMap.has(cal.id)) {
          newPreferences.push({
            userId: null,
            calendarId: cal.id,
            calendarName: cal.summary || '',
            backgroundColor: cal.backgroundColor || null,
            foregroundColor: cal.foregroundColor || null,
            isEnabled: true, // Default to enabled
            isPrimary: cal.primary || false,
            accessRole: cal.accessRole || null,
            lastSyncedAt: null,
          });
        }
      }
      
      // Save new preferences
      if (newPreferences.length > 0) {
        const savedPrefs = await storage.saveCalendarPreferences(newPreferences);
        savedPrefs.forEach(pref => prefsMap.set(pref.calendarId, pref));
      }
      
      // Merge Google calendars with preferences
      const mergedCalendars = googleCalendars.map(cal => {
        const pref = prefsMap.get(cal.id);
        return {
          id: cal.id,
          summary: cal.summary,
          description: cal.description,
          backgroundColor: cal.backgroundColor,
          foregroundColor: cal.foregroundColor,
          accessRole: cal.accessRole,
          primary: cal.primary,
          isEnabled: pref ? pref.isEnabled : true,
        };
      });
      
      res.json(mergedCalendars);
    } catch (error: any) {
      serverLogger.error('[API] Error fetching Google calendar list:', error);
      
      // Check if this is an authentication error
      const isAuthError = error.message?.toLowerCase().includes('unauthorized') ||
                         error.message?.toLowerCase().includes('authentication') ||
                         error.message?.toLowerCase().includes('invalid credentials') ||
                         error.code === 401 ||
                         error.status === 401;
      
      if (isAuthError) {
        return res.status(401).json({ 
          message: 'Google Calendar authentication expired. Please log out and reconnect your Google account in Settings.',
          error: error.message 
        });
      }
      
      res.status(500).json({ message: 'Failed to fetch calendar list', error: error.message });
    }
  });

  app.post("/api/upload-sessions", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      const validated = insertUploadSessionSchema.parse(req.body);
      const session = await storage.createUploadSession(validated);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'create upload session');
      res.status(status).json({ message });
    }
  });

  app.get("/api/upload-sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await storage.getUploadSessions();
      res.json(sessions);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch upload sessions');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/upload-sessions/:id/acknowledge", isAuthenticated, csrfSynchronisedProtection, async (req, res) => {
    try {
      await storage.acknowledgeUploadSession(req.params.id);
      res.json({ message: "Upload session acknowledged successfully" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'acknowledge upload session');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/summary", isAuthenticated, async (req, res) => {
    try {
      const summary = await storage.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch dashboard summary');
      res.status(status).json({ message });
    }
  });

  app.get("/api/dashboard/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getBuilderLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch builder leaderboard');
      res.status(status).json({ message });
    }
  });

  // Email Preferences API
  app.get("/api/email-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let prefs = await storage.getEmailPreferences(userId);
      
      // Create default preferences if they don't exist
      if (!prefs) {
        prefs = await storage.createEmailPreferences({ userId });
      }
      
      res.json(prefs);
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'fetch email preferences');
      res.status(status).json({ message });
    }
  });

  app.patch("/api/email-preferences", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertEmailPreferenceSchema.partial().parse(req.body);
      
      let prefs = await storage.getEmailPreferences(userId);
      
      if (!prefs) {
        // Create if doesn't exist
        prefs = await storage.createEmailPreferences({ userId, ...validated });
      } else {
        // Update existing
        prefs = await storage.updateEmailPreferences(userId, validated);
      }
      
      res.json(prefs);
    } catch (error) {
      if (error instanceof ZodError) {
        const { status, message } = handleValidationError(error);
        return res.status(status).json({ message });
      }
      const { status, message } = handleDatabaseError(error, 'update email preferences');
      res.status(status).json({ message });
    }
  });

  app.post("/api/email-preferences/unsubscribe/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const prefs = await storage.getEmailPreferencesByToken(token);
      
      if (!prefs) {
        return res.status(404).json({ message: "Invalid unsubscribe token" });
      }
      
      // Unsubscribe from all emails
      await storage.updateEmailPreferences(prefs.userId, {
        jobAssigned: false,
        jobStatusChanged: false,
        reportReady: false,
        calendarEvents: false,
        dailyDigest: false,
        weeklyPerformanceSummary: false,
      });
      
      res.json({ message: "You have been unsubscribed from all email notifications" });
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'unsubscribe from emails');
      res.status(status).json({ message });
    }
  });

  app.post("/api/email-preferences/test", isAuthenticated, csrfSynchronisedProtection, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(400).json({ message: "User email not found" });
      }
      
      const prefs = await storage.getEmailPreferences(userId);
      const unsubscribeToken = prefs?.unsubscribeToken || await storage.generateUnsubscribeToken(userId);
      
      const { subject, html } = jobAssignedTemplate({
        jobName: "Test Inspection - 123 Main St",
        address: "123 Main Street, City, State 12345",
        scheduledDate: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        builderName: "Test Builder Co.",
        contractor: "Test Contractor",
        inspectionType: "Final Inspection",
        viewJobUrl: `${process.env.APP_URL || 'http://localhost:5000'}/jobs/test`,
        unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:5000'}/api/email-preferences/unsubscribe/${unsubscribeToken}`,
        recipientName: user.firstName || undefined,
      });
      
      const result = await emailService.sendEmail(user.email, subject, html);
      
      if (result.success) {
        res.json({ message: "Test email sent successfully", messageId: result.messageId });
      } else {
        res.status(500).json({ message: "Failed to send test email", error: result.error });
      }
    } catch (error) {
      const { status, message } = handleDatabaseError(error, 'send test email');
      res.status(status).json({ message });
    }
  });

  // Audit Logs API Routes
  app.get("/api/audit-logs", isAuthenticated, requireRole('admin', 'manager'), async (req, res) => {
    try {
      const params = {
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await storage.getAuditLogs(params);
      res.json(result);
    } catch (error) {
      logError('AuditLogs/Get', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get("/api/audit-logs/export", isAuthenticated, requireRole('admin', 'manager'), async (req, res) => {
    try {
      const params = {
        userId: req.query.userId as string | undefined,
        action: req.query.action as string | undefined,
        resourceType: req.query.resourceType as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      // Get all matching logs (no pagination for export)
      const result = await storage.getAuditLogs({ ...params, limit: 10000, offset: 0 });
      
      // Convert to CSV
      const csvRows = [
        ['Timestamp', 'User ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent'].join(','),
        ...result.logs.map(log => [
          log.timestamp ? new Date(log.timestamp).toISOString() : '',
          log.userId || '',
          log.action,
          log.resourceType,
          log.resourceId || '',
          log.ipAddress || '',
          `"${(log.userAgent || '').replace(/"/g, '""')}"` // Escape quotes in user agent
        ].join(','))
      ];
      
      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`);
      res.send(csv);
    } catch (error) {
      logError('AuditLogs/Export', error);
      res.status(500).json({ message: 'Failed to export audit logs' });
    }
  });

  // Achievement API Routes
  app.get("/api/achievements", isAuthenticated, async (req, res) => {
    try {
      const achievements = await storage.getAllAchievements();
      res.json(achievements);
    } catch (error) {
      logError('Achievements/GetAll', error);
      res.status(500).json({ message: 'Failed to fetch achievements' });
    }
  });

  app.get("/api/achievements/user", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const userAchievements = await storage.getUserAchievementWithDetails(req.user.id);
      res.json(userAchievements);
    } catch (error) {
      logError('Achievements/GetUserAchievements', error);
      res.status(500).json({ message: 'Failed to fetch user achievements' });
    }
  });

  app.post("/api/achievements/check", isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      const { checkAndAwardAchievements } = await import('./achievementService');
      const awardedIds = await checkAndAwardAchievements(storage, req.user.id);
      
      res.json({ 
        message: awardedIds.length > 0 
          ? `Awarded ${awardedIds.length} new achievement(s)!` 
          : 'No new achievements earned',
        awardedAchievementIds: awardedIds,
        count: awardedIds.length
      });
    } catch (error) {
      logError('Achievements/Check', error);
      res.status(500).json({ message: 'Failed to check achievements' });
    }
  });

  app.post("/api/achievements/seed", isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { ACHIEVEMENT_DEFINITIONS } = await import("@shared/achievementDefinitions");
      
      // Convert achievement definitions to insert format
      const achievementInserts = ACHIEVEMENT_DEFINITIONS.map(def => ({
        id: def.id,
        name: def.name,
        description: def.description,
        type: def.type,
        iconName: def.iconName,
        criteria: def.criteria as any,
        tier: def.tier || null,
      }));
      
      await storage.seedAchievements(achievementInserts);
      res.json({ message: 'Achievements seeded successfully', count: achievementInserts.length });
    } catch (error) {
      logError('Achievements/Seed', error);
      res.status(500).json({ message: 'Failed to seed achievements' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
