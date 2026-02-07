# Reply Qualification Service

AI-powered email reply classification service. Analyzes incoming email replies to sales/outreach campaigns using Claude AI and classifies them into actionable categories.

## API Endpoints

All authenticated endpoints require the `X-API-Key` header.

### `POST /qualify`

Classify an email reply. Stores the request, runs AI classification, returns the result synchronously.

**Request body:**

| Field | Required | Description |
|---|---|---|
| `sourceService` | Yes | Service name (`mcpfactory`, `pressbeat`, etc.) |
| `sourceOrgId` | Yes | Clerk org ID or similar |
| `sourceRefId` | No | Campaign run ID, pitch ID, etc. |
| `fromEmail` | Yes | Sender email address |
| `toEmail` | Yes | Recipient email address |
| `subject` | No | Email subject line |
| `bodyText` | No | Plain text email body |
| `bodyHtml` | No | HTML email body (stripped if no bodyText) |
| `inReplyToMessageId` | No | Original message ID for threading |
| `emailReceivedAt` | No | ISO 8601 timestamp |
| `webhookUrl` | No | Callback URL for async notification |
| `byokApiKey` | No | User's own Anthropic API key (BYOK) |

**Response:**

```json
{
  "id": "uuid",
  "requestId": "uuid",
  "classification": "willing_to_meet",
  "confidence": 0.95,
  "reasoning": "The person explicitly asked to schedule a call",
  "suggestedAction": "forward_to_client",
  "extractedDetails": { "meeting_preference": "Tuesday afternoon" },
  "costUsd": 0.000123,
  "usedByok": false,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### `GET /qualifications/:id`

Fetch a specific qualification result by ID.

### `GET /qualifications`

List qualifications with optional filters: `sourceService`, `sourceOrgId`, `sourceRefId`, `limit` (default 50).

### `GET /openapi.json`

Returns the OpenAPI 3.0 spec for this service. No auth required. The spec is auto-generated at build time by `swagger-autogen`.

### `GET /health`

Basic health check. No auth required.

### `GET /health/debug`

Debug endpoint showing env var status and DB connection. No auth required.

## Classifications

| Classification | Description |
|---|---|
| `willing_to_meet` | Wants to schedule a meeting or call |
| `interested` | Positive response, open to discussion |
| `needs_more_info` | Curious but needs clarification |
| `not_interested` | Polite decline |
| `out_of_office` | Auto-reply, vacation |
| `unsubscribe` | Wants to be removed |
| `bounce` | Email delivery failure |
| `other` | Uncategorized |

## Setup

```bash
npm install
cp .env.example .env  # Fill in values
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `REPLY_QUALIFICATION_SERVICE_DATABASE_URL` | Neon PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Platform Anthropic key (used when no BYOK) |
| `REPLY_QUALIFICATION_SERVICE_API_KEY` | Service-to-service auth key |
| `SERVICE_URL` | Public URL for OpenAPI spec (e.g. `https://reply-qualification.mcpfactory.org`) |
| `PORT` | Server port (default: 3000) |

## Database

Uses Drizzle ORM with PostgreSQL (Neon). Migrations run automatically on startup.

**Tables:** `qualification_requests`, `qualifications`, `webhook_callbacks`, `users`, `orgs`, `tasks`, `tasks_runs`, `tasks_runs_costs`

```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio
```

## BYOK (Bring Your Own Key)

MCPFactory users pass their own Anthropic API key via `byokApiKey` in the request body. Pressbeat uses the platform key. Cost tracking applies to both.

## Auth

Service-to-service authentication via `X-API-Key` header. Optionally pass `X-Source-Service` to identify the calling service.

## AI Model

Uses Claude 3 Haiku (`claude-3-haiku-20240307`) for cost-effective classification. Pricing: $0.25/1M input tokens, $1.25/1M output tokens.

## Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests (needs DB)
```

## Docker

```bash
docker build -t reply-qualification-service .
docker run -p 3000:3000 --env-file .env reply-qualification-service
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled output |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run generate:openapi` | Generate OpenAPI spec |
| `npm run db:generate` | Generate DB migrations |
| `npm run db:migrate` | Run DB migrations |
| `npm run db:push` | Push schema directly to DB |
| `npm run db:studio` | Open Drizzle Studio |

## Tech Stack

- **Runtime:** Node 20, TypeScript (strict mode)
- **Framework:** Express 4
- **ORM:** Drizzle ORM + PostgreSQL (Neon)
- **AI:** Anthropic Claude 3 Haiku
- **Testing:** Vitest + Supertest
- **CI:** GitHub Actions (unit + integration tests on push/PR to main)
