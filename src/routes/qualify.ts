import { Router } from "express";
import { db } from "../db/index.js";
import { qualificationRequests, qualifications } from "../db/schema.js";
import { serviceAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { qualifyReply } from "../lib/anthropic.js";
import { eq } from "drizzle-orm";

const router = Router();

interface QualifyRequestBody {
  sourceService: string;
  sourceOrgId: string;
  sourceRefId?: string;
  fromEmail: string;
  toEmail: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyToMessageId?: string;
  emailReceivedAt?: string;
  webhookUrl?: string; // Optional callback URL for async notification
  byokApiKey?: string; // Optional BYOK Anthropic key (mcpfactory uses user's key, pressbeat uses platform key)
}

/**
 * POST /qualify - Qualify an email reply using AI
 * 
 * This endpoint:
 * 1. Stores the qualification request
 * 2. Runs AI classification
 * 3. Stores the result
 * 4. Returns the qualification synchronously
 */
router.post("/qualify", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as QualifyRequestBody;
    
    // Validate required fields
    if (!body.sourceService || !body.sourceOrgId || !body.fromEmail || !body.toEmail) {
      return res.status(400).json({
        error: "Missing required fields: sourceService, sourceOrgId, fromEmail, toEmail",
      });
    }
    
    // Store the request
    const [request] = await db
      .insert(qualificationRequests)
      .values({
        sourceService: body.sourceService,
        sourceOrgId: body.sourceOrgId,
        sourceRefId: body.sourceRefId,
        fromEmail: body.fromEmail,
        toEmail: body.toEmail,
        subject: body.subject,
        bodyText: body.bodyText,
        bodyHtml: body.bodyHtml,
        inReplyToMessageId: body.inReplyToMessageId,
        emailReceivedAt: body.emailReceivedAt ? new Date(body.emailReceivedAt) : null,
      })
      .returning();
    
    // Run AI qualification (supports BYOK - if byokApiKey provided, uses that instead of platform key)
    const result = await qualifyReply({
      subject: body.subject || null,
      bodyText: body.bodyText || null,
      bodyHtml: body.bodyHtml || null,
      byokApiKey: body.byokApiKey, // Optional: mcpfactory passes user's key, pressbeat omits
    });
    
    // Store the qualification
    const [qualification] = await db
      .insert(qualifications)
      .values({
        requestId: request.id,
        classification: result.classification as any,
        confidence: String(result.confidence),
        reasoning: result.reasoning,
        suggestedAction: result.suggestedAction,
        extractedDetails: result.extractedDetails,
        model: "claude-3-haiku-20240307",
        inputTokens: String(result.inputTokens),
        outputTokens: String(result.outputTokens),
        costUsd: String(result.costUsd),
        responseRaw: result.responseRaw,
      })
      .returning();
    
    res.json({
      id: qualification.id,
      requestId: request.id,
      classification: qualification.classification,
      confidence: parseFloat(String(qualification.confidence)),
      reasoning: qualification.reasoning,
      suggestedAction: qualification.suggestedAction,
      extractedDetails: qualification.extractedDetails,
      costUsd: parseFloat(String(qualification.costUsd)),
      usedByok: result.usedByok, // true if user's BYOK key was used
      createdAt: qualification.createdAt,
    });
  } catch (error) {
    console.error("Qualify error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /qualifications/:id - Get a specific qualification by ID
 */
router.get("/qualifications/:id", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    
    const qualification = await db.query.qualifications.findFirst({
      where: eq(qualifications.id, id),
    });
    
    if (!qualification) {
      return res.status(404).json({ error: "Qualification not found" });
    }
    
    res.json({
      id: qualification.id,
      requestId: qualification.requestId,
      classification: qualification.classification,
      confidence: parseFloat(String(qualification.confidence)),
      reasoning: qualification.reasoning,
      suggestedAction: qualification.suggestedAction,
      extractedDetails: qualification.extractedDetails,
      costUsd: parseFloat(String(qualification.costUsd || 0)),
      createdAt: qualification.createdAt,
    });
  } catch (error) {
    console.error("Get qualification error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /qualifications - List qualifications with filters
 */
router.get("/qualifications", serviceAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { sourceService, sourceOrgId, sourceRefId, limit = "50" } = req.query;
    
    // Build query with joins
    const results = await db
      .select({
        qualification: qualifications,
        request: qualificationRequests,
      })
      .from(qualifications)
      .innerJoin(qualificationRequests, eq(qualifications.requestId, qualificationRequests.id))
      .where(
        sourceOrgId
          ? eq(qualificationRequests.sourceOrgId, String(sourceOrgId))
          : undefined
      )
      .limit(parseInt(String(limit)))
      .orderBy(qualifications.createdAt);
    
    res.json(
      results.map((r) => ({
        id: r.qualification.id,
        requestId: r.request.id,
        sourceService: r.request.sourceService,
        sourceOrgId: r.request.sourceOrgId,
        sourceRefId: r.request.sourceRefId,
        fromEmail: r.request.fromEmail,
        subject: r.request.subject,
        classification: r.qualification.classification,
        confidence: parseFloat(String(r.qualification.confidence)),
        suggestedAction: r.qualification.suggestedAction,
        createdAt: r.qualification.createdAt,
      }))
    );
  } catch (error) {
    console.error("List qualifications error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
