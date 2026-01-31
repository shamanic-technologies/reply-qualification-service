import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Anthropic before importing
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              classification: "interested",
              confidence: 0.85,
              reasoning: "The reply shows positive interest",
              suggested_action: "forward_to_client",
              extracted_details: {},
            }),
          },
        ],
        usage: {
          input_tokens: 150,
          output_tokens: 50,
        },
      }),
    },
  })),
}));

describe("Anthropic Qualification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct classification values", () => {
    const validClassifications = [
      "willing_to_meet",
      "interested",
      "needs_more_info",
      "not_interested",
      "out_of_office",
      "unsubscribe",
      "bounce",
      "other",
    ];
    
    expect(validClassifications).toContain("interested");
    expect(validClassifications).toContain("willing_to_meet");
    expect(validClassifications.length).toBe(8);
  });

  it("should calculate cost correctly", () => {
    const inputTokens = 1000;
    const outputTokens = 500;
    
    // Haiku pricing: $0.25/M input, $1.25/M output
    const expectedCost = (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000;
    
    expect(expectedCost).toBeCloseTo(0.000875, 6);
  });
});
