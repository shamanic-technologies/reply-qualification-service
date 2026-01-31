import Anthropic from "@anthropic-ai/sdk";

// Cache for platform client (reused when no BYOK provided)
let platformClient: Anthropic | null = null;

/**
 * Get Anthropic client - supports BYOK (Bring Your Own Key)
 * @param byokApiKey - Optional user-provided API key (for mcpfactory)
 * @returns Anthropic client using either BYOK or platform key
 */
function getAnthropicClient(byokApiKey?: string): Anthropic {
  // If BYOK provided, create a new client with that key (don't cache)
  if (byokApiKey) {
    return new Anthropic({ apiKey: byokApiKey });
  }
  
  // Otherwise use platform key (cached)
  if (!platformClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set and no BYOK key provided");
    }
    platformClient = new Anthropic({ apiKey });
  }
  return platformClient;
}

export interface QualificationResult {
  classification: string;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  extractedDetails: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  usedByok: boolean;
  responseRaw: unknown;
}

const SYSTEM_PROMPT = `You are an expert at analyzing email replies to sales/outreach emails.

Your task is to classify the reply and extract relevant information.

Classifications:
- willing_to_meet: The person explicitly wants to schedule a meeting or call
- interested: Positive response, open to discussion, but no meeting request yet
- needs_more_info: Curious but needs clarification before deciding
- not_interested: Polite decline or rejection
- out_of_office: Auto-reply, vacation, or temporary unavailability
- unsubscribe: Wants to be removed from communications
- bounce: Email delivery failure notification
- other: Doesn't fit any category

Respond in JSON format:
{
  "classification": "one of the above",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of why you chose this classification",
  "suggested_action": "forward_to_client | auto_reply | schedule_followup | remove_from_list | ignore",
  "extracted_details": {
    "meeting_preference": "if they mentioned preferred times",
    "phone_number": "if they provided one",
    "alternative_contact": "if they suggested someone else",
    "objection": "main objection if not interested",
    "return_date": "if out of office"
  }
}`;

// Claude 3 Haiku pricing (per 1M tokens)
const HAIKU_INPUT_PRICE = 0.25;
const HAIKU_OUTPUT_PRICE = 1.25;

export interface QualifyOptions {
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  byokApiKey?: string; // Optional BYOK for mcpfactory users
}

export async function qualifyReply(options: QualifyOptions): Promise<QualificationResult> {
  const { subject, bodyText, bodyHtml, byokApiKey } = options;
  const usedByok = !!byokApiKey;
  const client = getAnthropicClient(byokApiKey);
  
  // Use text body if available, otherwise strip HTML
  const content = bodyText || stripHtml(bodyHtml || "");
  
  const userMessage = `Subject: ${subject || "(no subject)"}

Email body:
${content}`;

  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = (inputTokens * HAIKU_INPUT_PRICE + outputTokens * HAIKU_OUTPUT_PRICE) / 1_000_000;

  // Parse the response
  const textContent = response.content.find(c => c.type === "text");
  const responseText = textContent?.type === "text" ? textContent.text : "";
  
  let parsed: Record<string, unknown>;
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch?.[0] || "{}");
  } catch {
    parsed = {
      classification: "other",
      confidence: 0.5,
      reasoning: "Failed to parse AI response",
      suggested_action: "ignore",
      extracted_details: {},
    };
  }

  return {
    classification: String(parsed.classification || "other"),
    confidence: Number(parsed.confidence) || 0.5,
    reasoning: String(parsed.reasoning || ""),
    suggestedAction: String(parsed.suggested_action || "ignore"),
    extractedDetails: (parsed.extracted_details as Record<string, unknown>) || {},
    inputTokens,
    outputTokens,
    costUsd,
    usedByok,
    responseRaw: response,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
