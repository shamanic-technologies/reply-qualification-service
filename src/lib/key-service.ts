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
}

// --- Internal fetch wrapper ---

async function keyServiceFetch<T>(
  path: string,
  callerContext: CallerContext
): Promise<T | null> {
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

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `KeyService GET ${path} failed (${res.status}): ${text}`
    );
  }

  return res.json() as Promise<T>;
}

// --- Public API ---

export async function decryptOrgKey(
  provider: string,
  clerkOrgId: string,
  callerContext: CallerContext
): Promise<DecryptKeyResponse | null> {
  return keyServiceFetch<DecryptKeyResponse>(
    `/internal/keys/${encodeURIComponent(provider)}/decrypt?clerkOrgId=${encodeURIComponent(clerkOrgId)}`,
    callerContext
  );
}

export async function decryptAppKey(
  provider: string,
  appId: string,
  callerContext: CallerContext
): Promise<DecryptKeyResponse | null> {
  return keyServiceFetch<DecryptKeyResponse>(
    `/internal/app-keys/${encodeURIComponent(provider)}/decrypt?appId=${encodeURIComponent(appId)}`,
    callerContext
  );
}

export async function resolveAnthropicKey(params: {
  clerkOrgId?: string;
  appId?: string;
  callerContext: CallerContext;
}): Promise<{ apiKey: string; usedByok: boolean }> {
  const { clerkOrgId, appId, callerContext } = params;

  // Try BYOK first if clerkOrgId is provided
  if (clerkOrgId) {
    const byokResult = await decryptOrgKey("anthropic", clerkOrgId, callerContext);
    if (byokResult) {
      return { apiKey: byokResult.key, usedByok: true };
    }
  }

  // Fall back to app key
  const appResult = await decryptAppKey(
    "anthropic",
    appId || "reply-qualification-service",
    callerContext
  );
  if (appResult) {
    return { apiKey: appResult.key, usedByok: false };
  }

  throw new Error(
    `No Anthropic key found: neither BYOK for org "${clerkOrgId || "none"}" nor app key for "${appId || "reply-qualification-service"}" is configured in key-service`
  );
}
