const RUNS_SERVICE_URL =
  process.env.RUNS_SERVICE_URL || "https://runs.mcpfactory.org";
const RUNS_SERVICE_API_KEY = process.env.RUNS_SERVICE_API_KEY;

async function runsApiFetch<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  if (!RUNS_SERVICE_API_KEY) {
    throw new Error("RUNS_SERVICE_API_KEY is not set");
  }

  const res = await fetch(`${RUNS_SERVICE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": RUNS_SERVICE_API_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunsService ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// --- Types ---

export interface RunsServiceRun {
  id: string;
  organizationId: string;
  userId: string | null;
  appId: string;
  brandId: string | null;
  campaignId: string | null;
  serviceName: string;
  taskName: string;
  status: string;
  parentRunId: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RunsServiceCost {
  id: string;
  runId: string;
  costName: string;
  quantity: string;
  unitCostInUsdCents: string;
  totalCostInUsdCents: string;
  createdAt: string;
}

// --- API functions ---

export interface CreateRunParams {
  orgId: string;
  userId?: string;
  appId?: string;
  brandId?: string;
  campaignId?: string;
  parentRunId?: string;
}

export async function createRun(
  params: CreateRunParams
): Promise<RunsServiceRun> {
  return runsApiFetch<RunsServiceRun>("POST", "/v1/runs", {
    orgId: params.orgId,
    ...(params.userId && { userId: params.userId }),
    appId: params.appId || "mcpfactory",
    ...(params.brandId && { brandId: params.brandId }),
    ...(params.campaignId && { campaignId: params.campaignId }),
    serviceName: "reply-qualification-service",
    taskName: "qualify-reply",
    ...(params.parentRunId && { parentRunId: params.parentRunId }),
  });
}

export async function addCosts(
  runId: string,
  items: { costName: string; quantity: number }[]
): Promise<{ costs: RunsServiceCost[] }> {
  return runsApiFetch<{ costs: RunsServiceCost[] }>(
    "POST",
    `/v1/runs/${runId}/costs`,
    { items }
  );
}

export async function updateRunStatus(
  runId: string,
  status: "completed" | "failed"
): Promise<RunsServiceRun> {
  return runsApiFetch<RunsServiceRun>("PATCH", `/v1/runs/${runId}`, {
    status,
  });
}
