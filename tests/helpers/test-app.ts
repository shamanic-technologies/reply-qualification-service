import express from "express";
import healthRoutes from "../../src/routes/health.js";

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRoutes);
  return app;
}

export function getAuthHeaders() {
  return {
    "X-API-Key": process.env.REPLY_QUALIFICATION_SERVICE_API_KEY || "test-api-key",
    "X-Source-Service": "test-service",
  };
}
