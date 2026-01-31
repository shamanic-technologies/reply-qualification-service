import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "../helpers/test-app.js";

describe("Health Endpoint", () => {
  const app = createTestApp();

  it("should return health status", async () => {
    const response = await request(app).get("/health");
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("reply-qualification-service");
    expect(response.body.timestamp).toBeDefined();
  });
});
