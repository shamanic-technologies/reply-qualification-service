import { describe, it, expect } from "vitest";
import { KeySourceSchema, QualifyRequestSchema } from "../../src/schemas.js";

describe("KeySourceSchema", () => {
  it("should accept 'platform'", () => {
    expect(KeySourceSchema.parse("platform")).toBe("platform");
  });

  it("should accept 'app'", () => {
    expect(KeySourceSchema.parse("app")).toBe("app");
  });

  it("should accept 'byok'", () => {
    expect(KeySourceSchema.parse("byok")).toBe("byok");
  });

  it("should reject invalid values", () => {
    expect(() => KeySourceSchema.parse("invalid")).toThrow();
  });
});

describe("QualifyRequestSchema keySource field", () => {
  const validBase = {
    sourceService: "test-service",
    sourceOrgId: "org_123",
    fromEmail: "from@example.com",
    toEmail: "to@example.com",
  };

  it("should accept request with keySource 'platform'", () => {
    const result = QualifyRequestSchema.safeParse({
      ...validBase,
      keySource: "platform",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keySource).toBe("platform");
    }
  });

  it("should accept request with keySource 'app'", () => {
    const result = QualifyRequestSchema.safeParse({
      ...validBase,
      keySource: "app",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keySource).toBe("app");
    }
  });

  it("should accept request with keySource 'byok'", () => {
    const result = QualifyRequestSchema.safeParse({
      ...validBase,
      keySource: "byok",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keySource).toBe("byok");
    }
  });

  it("should accept request without keySource (optional)", () => {
    const result = QualifyRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keySource).toBeUndefined();
    }
  });

  it("regression: should reject keySource values not in enum", () => {
    const result = QualifyRequestSchema.safeParse({
      ...validBase,
      keySource: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
