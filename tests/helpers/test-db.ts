import { db, sql } from "../../src/db/index.js";
import { qualificationRequests, qualifications, webhookCallbacks } from "../../src/db/schema.js";

/**
 * Clean all test data from the database
 */
export async function cleanTestData() {
  await db.delete(webhookCallbacks);
  await db.delete(qualifications);
  await db.delete(qualificationRequests);
}

/**
 * Insert a test qualification request
 */
export async function insertTestRequest(data: {
  sourceService?: string;
  sourceOrgId?: string;
  fromEmail?: string;
  toEmail?: string;
  subject?: string;
  bodyText?: string;
} = {}) {
  const [request] = await db
    .insert(qualificationRequests)
    .values({
      sourceService: data.sourceService || "test-service",
      sourceOrgId: data.sourceOrgId || `test-org-${Date.now()}`,
      fromEmail: data.fromEmail || "sender@example.com",
      toEmail: data.toEmail || "recipient@example.com",
      subject: data.subject || "Test Subject",
      bodyText: data.bodyText || "Test body",
    })
    .returning();
  return request;
}

/**
 * Insert a test qualification
 */
export async function insertTestQualification(
  requestId: string,
  data: {
    classification?: "willing_to_meet" | "interested" | "needs_more_info" | "not_interested" | "out_of_office" | "unsubscribe" | "bounce" | "other";
    confidence?: string;
    reasoning?: string;
  } = {}
) {
  const [qualification] = await db
    .insert(qualifications)
    .values({
      requestId,
      classification: data.classification || "interested",
      confidence: data.confidence || "0.85",
      reasoning: data.reasoning || "Test reasoning",
    })
    .returning();
  return qualification;
}

/**
 * Insert a test webhook callback
 */
export async function insertTestWebhookCallback(
  qualificationId: string,
  data: { webhookUrl?: string; status?: string } = {}
) {
  const [callback] = await db
    .insert(webhookCallbacks)
    .values({
      qualificationId,
      webhookUrl: data.webhookUrl || "https://example.com/webhook",
      status: data.status || "pending",
    })
    .returning();
  return callback;
}

/**
 * Close database connection
 */
export async function closeDb() {
  await sql.end();
}

/**
 * Generate a random UUID
 */
export function randomId(): string {
  return crypto.randomUUID();
}
