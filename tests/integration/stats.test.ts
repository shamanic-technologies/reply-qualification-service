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

  it("should return stats for all qualifications when no filter", async () => {
    const res = await request(app).get("/stats").set(getAuthHeaders());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.byClassification.interested).toBe(2);
    expect(res.body.byClassification.not_interested).toBe(1);
    expect(res.body.totalCostUsd).toBeTypeOf("number");
    expect(res.body.totalInputTokens).toBeTypeOf("number");
    expect(res.body.totalOutputTokens).toBeTypeOf("number");
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
