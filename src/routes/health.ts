import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "reply-qualification-service",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health/debug", async (_req, res) => {
  const apiKey = process.env.REPLY_QUALIFICATION_SERVICE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const dbUrl = process.env.REPLY_QUALIFICATION_SERVICE_DATABASE_URL;
  
  let dbStatus = "unknown";
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }
  
  res.json({
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 4) || "none",
    anthropicKeyConfigured: !!anthropicKey,
    anthropicKeyPrefix: anthropicKey?.substring(0, 10) || "none",
    dbUrlConfigured: !!dbUrl,
    dbStatus,
  });
});

export default router;
