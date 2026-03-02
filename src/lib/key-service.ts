const KEY_SERVICE_URL =
  process.env.KEY_SERVICE_URL || "https://keys.mcpfactory.org";
const KEY_SERVICE_API_KEY = process.env.KEY_SERVICE_API_KEY;

// --- Types ---

export interface CallerContext {
  callerService: string;
  callerMethod: string;
  callerPath: string;
}

export interface DecryptKeyResponse {
  provider: string;
  key: string;
  keySource: "platform" | "org";
}

// --- Internal fetch wrapper ---

async function keyServiceFetch<T>(
  path: string,
  callerContext: CallerContext
): Promise<T> {
  if (!KEY_SERVICE_API_KEY) {
    throw new Error("KEY_SERVICE_API_KEY is not set");
  }

  const res = await fetch(`${KEY_SERVICE_URL}${path}`, {
    method: "GET",
    headers: {
      "X-API-Key": KEY_SERVICE_API_KEY,
      "x-caller-service": callerContext.callerService,
      "x-caller-method": callerContext.callerMethod,
      "x-caller-path": callerContext.callerPath,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `KeyService GET ${path} failed (${res.status}): ${text}`
    );
  }

  return res.json() as Promise<T>;
}

// --- Public API ---

/**
 * Resolve an API key for a provider via key-service.
 * Uses GET /keys/:provider/decrypt?orgId=<orgId>&userId=<userId>
 * key-service auto-resolves whether to use org or platform key.
 */
export async function resolveAnthropicKey(params: {
  orgId: string;
  userId: string;
  callerContext: CallerContext;
}): Promise<{ apiKey: string; keySource: "platform" | "org" }> {
  const { orgId, userId, callerContext } = params;

  const result = await keyServiceFetch<DecryptKeyResponse>(
    `/keys/anthropic/decrypt?orgId=${encodeURIComponent(orgId)}&userId=${encodeURIComponent(userId)}`,
    callerContext
  );

  return { apiKey: result.key, keySource: result.keySource };
}
