import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "reply-qualification-service",
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check env var status
router.get("/health/debug", (req, res) => {
  const apiKey = process.env.REPLY_QUALIFICATION_SERVICE_API_KEY;
  res.json({
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 4) || "none",
    envVars: Object.keys(process.env).filter(k => k.includes("REPLY") || k.includes("API")),
  });
});

export default router;
