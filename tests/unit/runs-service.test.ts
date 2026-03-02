import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set env vars before importing
vi.stubEnv("RUNS_SERVICE_URL", "https://runs.test.local");
vi.stubEnv("RUNS_SERVICE_API_KEY", "test-key");

const { createRun, addCosts, updateRunStatus } = await import(
  "../../src/lib/runs-service.js"
);

describe("RunsService client", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a run with all provided fields", async () => {
    const fakeRun = { id: "run-123", status: "running" };
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeRun),
    });

    const result = await createRun({
      orgId: "org_abc",
      userId: "user_xyz",
      brandId: "brand-1",
      campaignId: "camp-1",
      parentRunId: "parent-run-1",
    });

    expect(result).toEqual(fakeRun);
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://runs.test.local/v1/runs");
    expect(opts.method).toBe("POST");
    expect(opts.headers["X-API-Key"]).toBe("test-key");

    const body = JSON.parse(opts.body);
    expect(body.orgId).toBe("org_abc");
    expect(body.userId).toBe("user_xyz");
    expect(body.appId).toBe("reply-qualification-service");
    expect(body.brandId).toBe("brand-1");
    expect(body.campaignId).toBe("camp-1");
    expect(body.parentRunId).toBe("parent-run-1");
    expect(body.serviceName).toBe("reply-qualification-service");
    expect(body.taskName).toBe("qualify-reply");
  });

  it("should always hardcode appId to reply-qualification-service", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "run-456" }),
    });

    await createRun({ orgId: "org_abc", userId: "user_xyz" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.appId).toBe("reply-qualification-service");
  });

  it("should omit optional fields when not provided", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "run-789" }),
    });

    await createRun({ orgId: "org_abc", userId: "user_xyz" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("brandId");
    expect(body).not.toHaveProperty("campaignId");
    expect(body).not.toHaveProperty("parentRunId");
  });

  it("should add costs with costSource to a run", async () => {
    const fakeCosts = { costs: [{ id: "cost-1", costName: "test", costSource: "platform" }] };
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeCosts),
    });

    const result = await addCosts("run-123", [
      { costName: "anthropic-haiku-4.5-tokens-input", costSource: "platform", quantity: 150 },
      { costName: "anthropic-haiku-4.5-tokens-output", costSource: "platform", quantity: 50 },
    ]);

    expect(result).toEqual(fakeCosts);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://runs.test.local/v1/runs/run-123/costs");
    expect(opts.method).toBe("POST");

    const body = JSON.parse(opts.body);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].costName).toBe("anthropic-haiku-4.5-tokens-input");
    expect(body.items[0].costSource).toBe("platform");
    expect(body.items[0].quantity).toBe(150);
    expect(body.items[1].costSource).toBe("platform");
  });

  it("should pass org costSource when using org key", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ costs: [] }),
    });

    await addCosts("run-123", [
      { costName: "anthropic-haiku-4.5-tokens-input", costSource: "org", quantity: 100 },
    ]);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.items[0].costSource).toBe("org");
  });

  it("should update run status", async () => {
    const fakeRun = { id: "run-123", status: "completed" };
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeRun),
    });

    const result = await updateRunStatus("run-123", "completed");

    expect(result).toEqual(fakeRun);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://runs.test.local/v1/runs/run-123");
    expect(opts.method).toBe("PATCH");

    const body = JSON.parse(opts.body);
    expect(body.status).toBe("completed");
  });

  it("should throw on non-ok response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"error":"bad request"}'),
    });

    await expect(createRun({ orgId: "org_abc", userId: "user_xyz" })).rejects.toThrow(
      "RunsService POST /v1/runs failed (400)"
    );
  });
});
