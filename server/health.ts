import type { Request, Response } from "express";
import { serverLogger } from "./logger";
import { getConfig } from "./config";
import { storage } from "./storage";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database?: {
      status: "healthy" | "unhealthy";
      responseTime?: number;
      error?: string;
    };
    config?: {
      status: "healthy" | "unhealthy";
      error?: string;
    };
  };
}

/**
 * Basic liveness probe - returns 200 if server is running
 * Use this for container orchestration liveness checks
 */
export async function healthz(req: Request, res: Response) {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Readiness probe - returns 200 only if server is ready to handle traffic
 * Checks all critical dependencies (database, config, etc.)
 */
export async function readyz(req: Request, res: Response) {
  const startTime = Date.now();
  const health: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  try {
    // Check configuration
    try {
      getConfig();
      health.checks.config = { status: "healthy" };
    } catch (error) {
      health.checks.config = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Configuration error",
      };
      health.status = "unhealthy";
    }

    // Check database connection
    try {
      const dbStartTime = Date.now();
      // Try a simple query to verify database connectivity
      await storage.getAllJobs();
      const responseTime = Date.now() - dbStartTime;
      
      health.checks.database = {
        status: "healthy",
        responseTime,
      };
    } catch (error) {
      health.checks.database = {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Database error",
      };
      health.status = "degraded";
    }

    // Determine overall status
    const hasUnhealthyChecks = Object.values(health.checks).some(
      (check) => check.status === "unhealthy"
    );
    
    if (hasUnhealthyChecks) {
      health.status = "unhealthy";
    }

    const totalTime = Date.now() - startTime;
    serverLogger.debug(`[Health] Readiness check completed in ${totalTime}ms - status: ${health.status}`);

    // Return 200 for healthy/degraded, 503 for unhealthy
    const statusCode = health.status === "unhealthy" ? 503 : 200;
    res.status(statusCode).json(health);
  } catch (error) {
    serverLogger.error("[Health] Readiness check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : "Health check failed",
    });
  }
}

/**
 * Detailed status endpoint - returns comprehensive system information
 * Use this for debugging and monitoring dashboards
 */
export async function status(req: Request, res: Response) {
  const config = getConfig();
  
  const statusInfo = {
    status: "operational",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    commitSha: process.env.GIT_COMMIT_SHA || process.env.REPL_ID || "development",
    environment: config.nodeEnv,
    uptime: {
      seconds: process.uptime(),
      formatted: formatUptime(process.uptime()),
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      unit: "MB",
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
    },
    config: {
      environment: config.nodeEnv,
      port: config.port,
      databaseConfigured: !!config.databaseUrl,
      authDomains: config.replitDomains.length,
    },
  };

  res.status(200).json(statusInfo);
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}
