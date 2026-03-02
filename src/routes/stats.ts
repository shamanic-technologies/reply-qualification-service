import { Router } from "express";
import { db } from "../db/index.js";
import { qualificationRequests, qualifications } from "../db/schema.js";
import { serviceAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { eq, sql, and } from "drizzle-orm";
import { StatsQuerySchema } from "../schemas.js";

const router = Router();

/**
 * GET /stats - Aggregated qualification statistics
 */
router.get("/stats", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = StatsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }

    const filters = parsed.data;

    // Require at least one filter to prevent unscoped global queries
    const hasFilter = Object.values(filters).some((v) => v !== undefined);
    if (!hasFilter) {
      return res.status(400).json({
        error: "At least one filter parameter is required (orgId, userId, brandId, campaignId, or runId)",
      });
    }

    // Build WHERE conditions dynamically
    const conditions = [];
    if (filters.orgId)
      conditions.push(eq(qualificationRequests.orgId, filters.orgId));
    if (filters.userId)
      conditions.push(
        eq(qualificationRequests.userId, filters.userId)
      );
    if (filters.brandId)
      conditions.push(eq(qualificationRequests.brandId, filters.brandId));
    if (filters.campaignId)
      conditions.push(
        eq(qualificationRequests.campaignId, filters.campaignId)
      );
    if (filters.runId)
      conditions.push(eq(qualificationRequests.runId, filters.runId));

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        classification: qualifications.classification,
        count: sql<number>`count(*)::int`,
        costUsd: sql<number>`coalesce(sum(${qualifications.costUsd}), 0)::float`,
        inputTokens: sql<number>`coalesce(sum(${qualifications.inputTokens}), 0)::int`,
        outputTokens: sql<number>`coalesce(sum(${qualifications.outputTokens}), 0)::int`,
      })
      .from(qualifications)
      .innerJoin(
        qualificationRequests,
        eq(qualifications.requestId, qualificationRequests.id)
      )
      .where(whereClause)
      .groupBy(qualifications.classification);

    const byClassification: Record<string, number> = {};
    let total = 0;
    let totalCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const row of rows) {
      byClassification[row.classification] = row.count;
      total += row.count;
      totalCostUsd += row.costUsd;
      totalInputTokens += row.inputTokens;
      totalOutputTokens += row.outputTokens;
    }

    res.json({
      total,
      byClassification,
      totalCostUsd,
      totalInputTokens,
      totalOutputTokens,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
