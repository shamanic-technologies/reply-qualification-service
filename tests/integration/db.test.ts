import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { qualificationRequests, qualifications, webhookCallbacks } from "../../src/db/schema.js";
import { cleanTestData, closeDb, insertTestRequest, insertTestQualification, insertTestWebhookCallback } from "../helpers/test-db.js";

describe("Reply Qualification Service Database", () => {
  beforeEach(async () => {
    await cleanTestData();
  });

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
      const request = await insertTestRequest();
      const qualification = await insertTestQualification(request.id, {
        classification: "willing_to_meet",
        confidence: "0.95",
        reasoning: "Explicit request to schedule a call",
      });
      
      expect(qualification.id).toBeDefined();
      expect(qualification.classification).toBe("willing_to_meet");
      expect(parseFloat(qualification.confidence!)).toBe(0.95);
    });

    it("should cascade delete when request is deleted", async () => {
      const request = await insertTestRequest();
      const qualification = await insertTestQualification(request.id);
      
      await db.delete(qualificationRequests).where(eq(qualificationRequests.id, request.id));
      
      const found = await db.query.qualifications.findFirst({
        where: eq(qualifications.id, qualification.id),
      });
      expect(found).toBeUndefined();
    });

    it("should support all classification types", async () => {
      const classifications = [
        "willing_to_meet", "interested", "needs_more_info", "not_interested",
        "out_of_office", "unsubscribe", "bounce", "other"
      ] as const;
      
      for (const classification of classifications) {
        const request = await insertTestRequest();
        const qualification = await insertTestQualification(request.id, { classification });
        expect(qualification.classification).toBe(classification);
      }
    });
  });

  describe("webhookCallbacks table", () => {
    it("should create a webhook callback linked to qualification", async () => {
      const request = await insertTestRequest();
      const qualification = await insertTestQualification(request.id);
      const callback = await insertTestWebhookCallback(qualification.id, {
        webhookUrl: "https://api.example.com/callback",
        status: "pending",
      });
      
      expect(callback.id).toBeDefined();
      expect(callback.webhookUrl).toBe("https://api.example.com/callback");
    });

    it("should cascade delete when qualification is deleted", async () => {
      const request = await insertTestRequest();
      const qualification = await insertTestQualification(request.id);
      const callback = await insertTestWebhookCallback(qualification.id);
      
      await db.delete(qualifications).where(eq(qualifications.id, qualification.id));
      
      const found = await db.query.webhookCallbacks.findFirst({
        where: eq(webhookCallbacks.id, callback.id),
      });
      expect(found).toBeUndefined();
    });
  });
});
