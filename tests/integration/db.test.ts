import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { qualificationRequests, qualifications, webhookCallbacks } from "../../src/db/schema.js";
import { cleanTestData, closeDb, insertTestRequest, insertTestQualification, insertTestWebhookCallback } from "../helpers/test-db.js";

describe("Reply Qualification Service Database", () => {
  afterAll(async () => {
    await cleanTestData();
    await closeDb();
  });

  describe("qualificationRequests table", () => {
    it("should create and query a request", async () => {
      const request = await insertTestRequest({
        sourceService: "mcpfactory",
        sourceOrgId: "org_123",
        fromEmail: "lead@company.com",
        toEmail: "sales@ourcompany.com",
        subject: "Re: Your proposal",
        bodyText: "I'm interested, let's schedule a call.",
      });
      
      expect(request.id).toBeDefined();
      expect(request.sourceService).toBe("mcpfactory");
      expect(request.fromEmail).toBe("lead@company.com");
    });
  });

  describe("qualifications table", () => {
    it("should create a qualification linked to request", async () => {
      const { qualification } = await db.transaction(async (tx) => {
        const request = await insertTestRequest({}, tx);
        const qualification = await insertTestQualification(request.id, {
          classification: "willing_to_meet",
          confidence: "0.95",
          reasoning: "Explicit request to schedule a call",
        }, tx);
        return { request, qualification };
      });

      expect(qualification.id).toBeDefined();
      expect(qualification.classification).toBe("willing_to_meet");
      expect(parseFloat(qualification.confidence!)).toBe(0.95);
    });

    it("should cascade delete when request is deleted", async () => {
      const { request, qualification } = await db.transaction(async (tx) => {
        const request = await insertTestRequest({}, tx);
        const qualification = await insertTestQualification(request.id, {}, tx);
        return { request, qualification };
      });

      await db.delete(qualificationRequests).where(eq(qualificationRequests.id, request.id));

      const found = await db.query.qualifications.findFirst({
        where: eq(qualifications.id, qualification.id),
      });
      expect(found).toBeUndefined();
    });

    it("should support all classification types", { timeout: 30000 }, async () => {
      const classifications = [
        "willing_to_meet", "interested", "needs_more_info", "not_interested",
        "out_of_office", "unsubscribe", "bounce", "other"
      ] as const;

      for (const classification of classifications) {
        const qualification = await db.transaction(async (tx) => {
          const request = await insertTestRequest({}, tx);
          return await insertTestQualification(request.id, { classification }, tx);
        });
        expect(qualification.classification).toBe(classification);
      }
    });
  });

  describe("regression: service_run_id column", () => {
    it("regression: should support service_run_id in qualification_requests", async () => {
      const request = await insertTestRequest({
        sourceService: "mcpfactory",
        sourceOrgId: "org_run_test",
        fromEmail: "lead@company.com",
        toEmail: "sales@ourcompany.com",
      });

      // Update with a service_run_id value
      const [updated] = await db
        .update(qualificationRequests)
        .set({ serviceRunId: "run_abc123" })
        .where(eq(qualificationRequests.id, request.id))
        .returning();

      expect(updated.serviceRunId).toBe("run_abc123");
    });

    it("regression: GET /qualifications join should not fail on service_run_id", async () => {
      // This query mirrors the GET /qualifications endpoint join
      // which previously failed with: column qualification_requests.service_run_id does not exist
      const results = await db
        .select({
          qualification: qualifications,
          request: qualificationRequests,
        })
        .from(qualifications)
        .innerJoin(
          qualificationRequests,
          eq(qualifications.requestId, qualificationRequests.id)
        )
        .limit(1);

      // Should not throw - the query itself succeeding is the assertion
      expect(results).toBeDefined();
    });
  });

  describe("webhookCallbacks table", () => {
    it("should create a webhook callback linked to qualification", async () => {
      const callback = await db.transaction(async (tx) => {
        const request = await insertTestRequest({}, tx);
        const qualification = await insertTestQualification(request.id, {}, tx);
        return await insertTestWebhookCallback(qualification.id, {
          webhookUrl: "https://api.example.com/callback",
          status: "pending",
        }, tx);
      });

      expect(callback.id).toBeDefined();
      expect(callback.webhookUrl).toBe("https://api.example.com/callback");
    });

    it("should cascade delete when qualification is deleted", async () => {
      const { qualification, callback } = await db.transaction(async (tx) => {
        const request = await insertTestRequest({}, tx);
        const qualification = await insertTestQualification(request.id, {}, tx);
        const callback = await insertTestWebhookCallback(qualification.id, {}, tx);
        return { qualification, callback };
      });

      await db.delete(qualifications).where(eq(qualifications.id, qualification.id));

      const found = await db.query.webhookCallbacks.findFirst({
        where: eq(webhookCallbacks.id, callback.id),
      });
      expect(found).toBeUndefined();
    });
  });
});
