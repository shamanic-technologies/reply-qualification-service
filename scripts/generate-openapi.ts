import swaggerAutogen from "swagger-autogen";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const doc = {
  info: {
    version: "0.1.0",
    title: "Reply Qualification Service",
    description:
      "AI-powered email reply classification service. Analyzes incoming email replies using Claude AI and classifies them into actionable categories.",
  },
  host: "localhost:3000",
  basePath: "/",
  schemes: ["https", "http"],
  securityDefinitions: {
    apiKey: {
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
      description: "Service-to-service API key",
    },
  },
  definitions: {
    QualifyRequest: {
      sourceService: "mcpfactory",
      sourceOrgId: "org_123",
      sourceRefId: "campaign_456",
      fromEmail: "sender@example.com",
      toEmail: "recipient@example.com",
      subject: "Re: Your outreach",
      bodyText: "Sure, I'd love to chat. How about Tuesday?",
      bodyHtml: "",
      inReplyToMessageId: "msg_789",
      emailReceivedAt: "2025-01-01T00:00:00.000Z",
      webhookUrl: "https://example.com/webhook",
      byokApiKey: "",
    },
    QualifyResponse: {
      id: "uuid",
      requestId: "uuid",
      classification: "willing_to_meet",
      confidence: 0.95,
      reasoning: "The person explicitly asked to schedule a call",
      suggestedAction: "forward_to_client",
      extractedDetails: { meeting_preference: "Tuesday afternoon" },
      costUsd: 0.000123,
      usedByok: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    QualificationItem: {
      id: "uuid",
      requestId: "uuid",
      sourceService: "mcpfactory",
      sourceOrgId: "org_123",
      sourceRefId: "campaign_456",
      fromEmail: "sender@example.com",
      subject: "Re: Your outreach",
      classification: "willing_to_meet",
      confidence: 0.95,
      suggestedAction: "forward_to_client",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    HealthResponse: {
      status: "ok",
      service: "reply-qualification-service",
      timestamp: "2025-01-01T00:00:00.000Z",
    },
    Error: {
      error: "Error message",
    },
  },
};

const outputFile = resolve(__dirname, "../openapi.json");
const routes = [
  resolve(__dirname, "../src/routes/health.ts"),
  resolve(__dirname, "../src/routes/qualify.ts"),
];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc);
