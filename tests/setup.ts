import { beforeAll, afterAll, vi } from "vitest";

// Set test environment variables
process.env.REPLY_QUALIFICATION_SERVICE_DATABASE_URL = 
  process.env.REPLY_QUALIFICATION_SERVICE_DATABASE_URL || "postgresql://test:test@localhost/test";
process.env.REPLY_QUALIFICATION_SERVICE_API_KEY = "test-api-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

beforeAll(() => {
  console.log("Test suite starting...");
});

afterAll(() => {
  console.log("Test suite complete.");
});
