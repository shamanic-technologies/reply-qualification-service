import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createTestApp, getAuthHeaders } from "../helpers/test-app.js";
import {
  cleanTestData,
  closeDb,
  insertTestRequest,
  insertTestQualification,
} from "../helpers/test-db.js";

describe("GET /stats", () => {
  const app = createTestApp();

  beforeAll(async () => {
    await cleanTestData();

    // Org A, campaign X, app1 — 2 qualifications
    const r1 = await insertTestRequest({
      clerkOrgId: "org_A",
      campaignId: "camp_X",
      appId: "app1",
      brandId: "brand_1",
    });
    await insertTestQualification(r1.id, {
      classification: "interested",
      confidence: "0.90",
    });

    const r2 = await insertTestRequest({
      clerkOrgId: "org_A",
      campaignId: "camp_X",
      appId: "app1",
      brandId: "brand_1",
    });
    await insertTestQualification(r2.id, {
      classification: "not_interested",
      confidence: "0.80",
    });

    // Org B, campaign Y, app2 — 1 qualification
    const r3 = await insertTestRequest({
      clerkOrgId: "org_B",
      campaignId: "camp_Y",
      appId: "app2",
      brandId: "brand_2",
    });
    await insertTestQualification(r3.id, {
      classification: "interested",
      confidence: "0.75",
    });
  });

  afterAll(async () => {
    await cleanTestData();
    await closeDb();
  });

  it("should reject requests with no filter to prevent unscoped queries", async () => {
    const res = await request(app).get("/stats").set(getAuthHeaders());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least one filter/i);
  });

  it("regression: should not return global data without filters (test data leak)", async () => {
    // Previously, calling /stats without filters returned ALL rows including test data,
    // which caused the dashboard to show fake reply classifications (42 willing_to_meet,
    // 42 not_interested) when there were actually 0 replies.
    // Root cause: CI integration tests wrote to production DB due to misconfigured
    // REPLY_QUALIFICATION_SERVICE_DATABASE_URL_DEV secret pointing to prod instead of dev.
    const res = await request(app).get("/stats").set(getAuthHeaders());
    expect(res.status).toBe(400);
    expect(res.body.total).toBeUndefined();
  });

  it("should filter by clerkOrgId", async () => {
    const res = await request(app)
      .get("/stats?clerkOrgId=org_A")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byClassification.interested).toBe(1);
    expect(res.body.byClassification.not_interested).toBe(1);
  });

  it("should filter by campaignId", async () => {
    const res = await request(app)
      .get("/stats?campaignId=camp_Y")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.byClassification.interested).toBe(1);
  });

  it("should filter by appId", async () => {
    const res = await request(app)
      .get("/stats?appId=app2")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it("should filter by brandId", async () => {
    const res = await request(app)
      .get("/stats?brandId=brand_1")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("should support combined filters", async () => {
    const res = await request(app)
      .get("/stats?clerkOrgId=org_A&campaignId=camp_X")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("should return empty stats when no matches", async () => {
    const res = await request(app)
      .get("/stats?clerkOrgId=nonexistent")
      .set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.byClassification).toEqual({});
    expect(res.body.totalCostUsd).toBe(0);
    expect(res.body.totalInputTokens).toBe(0);
    expect(res.body.totalOutputTokens).toBe(0);
  });

  it("should require auth", async () => {
    const res = await request(app).get("/stats");
    expect(res.status).toBe(401);
  });
});
