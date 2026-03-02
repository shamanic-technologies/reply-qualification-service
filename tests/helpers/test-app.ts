import express from "express";
import healthRoutes from "../../src/routes/health.js";
import statsRoutes from "../../src/routes/stats.js";

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRoutes);
  app.use(statsRoutes);
  return app;
}

export function getAuthHeaders(overrides?: Record<string, string>) {
  return {
    "X-API-Key": process.env.REPLY_QUALIFICATION_SERVICE_API_KEY || "test-api-key",
    "X-Source-Service": "test-service",
    "x-org-id": "test-org-id",
    "x-user-id": "test-user-id",
    ...overrides,
  };
}
