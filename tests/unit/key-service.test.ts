import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Set env vars before importing
vi.stubEnv("KEY_SERVICE_URL", "https://keys.test.local");
vi.stubEnv("KEY_SERVICE_API_KEY", "test-key");

const { decryptOrgKey, decryptAppKey, resolveAnthropicKey } = await import(
  "../../src/lib/key-service.js"
);

const callerContext = {
  callerService: "reply-qualification-service",
  callerMethod: "POST",
  callerPath: "/qualify",
};

describe("KeyService client", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- decryptOrgKey ---

  it("should call correct URL with clerkOrgId and include caller headers", async () => {
    const fakeResponse = { provider: "anthropic", key: "sk-ant-org-123" };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fakeResponse),
    });

    const result = await decryptOrgKey("anthropic", "org_abc", callerContext);

    expect(result).toEqual(fakeResponse);
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      "https://keys.test.local/internal/keys/anthropic/decrypt?clerkOrgId=org_abc"
    );
    expect(opts.method).toBe("GET");
    expect(opts.headers["X-API-Key"]).toBe("test-key");
    expect(opts.headers["x-caller-service"]).toBe("reply-qualification-service");
    expect(opts.headers["x-caller-method"]).toBe("POST");
    expect(opts.headers["x-caller-path"]).toBe("/qualify");
  });

  it("should return null on 404 for org key", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });

    const result = await decryptOrgKey("anthropic", "org_missing", callerContext);
    expect(result).toBeNull();
  });

  it("should throw on non-404 errors for org key", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal server error"),
    });

    await expect(
      decryptOrgKey("anthropic", "org_abc", callerContext)
    ).rejects.toThrow("KeyService GET");
  });

  // --- decryptAppKey ---

  it("should call correct URL with appId and include caller headers", async () => {
    const fakeResponse = { provider: "anthropic", key: "sk-ant-app-456" };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(fakeResponse),
    });

    const result = await decryptAppKey("anthropic", "my-app", callerContext);

    expect(result).toEqual(fakeResponse);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      "https://keys.test.local/internal/app-keys/anthropic/decrypt?appId=my-app"
    );
    expect(opts.headers["x-caller-service"]).toBe("reply-qualification-service");
    expect(opts.headers["x-caller-method"]).toBe("POST");
    expect(opts.headers["x-caller-path"]).toBe("/qualify");
  });

  it("should return null on 404 for app key", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });

    const result = await decryptAppKey("anthropic", "missing-app", callerContext);
    expect(result).toBeNull();
  });

  // --- resolveAnthropicKey ---

  it("should return BYOK key when clerkOrgId is provided and key exists", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ provider: "anthropic", key: "sk-ant-byok" }),
    });

    const result = await resolveAnthropicKey({
      clerkOrgId: "org_abc",
      callerContext,
    });

    expect(result).toEqual({ apiKey: "sk-ant-byok", usedByok: true });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toContain("/internal/keys/anthropic/decrypt");
  });

  it("should fall back to app key when BYOK returns 404", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ provider: "anthropic", key: "sk-ant-app" }),
      });

    const result = await resolveAnthropicKey({
      clerkOrgId: "org_abc",
      appId: "my-app",
      callerContext,
    });

    expect(result).toEqual({ apiKey: "sk-ant-app", usedByok: false });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0][0]).toContain("/internal/keys/anthropic/decrypt");
    expect(fetchSpy.mock.calls[1][0]).toContain("/internal/app-keys/anthropic/decrypt?appId=my-app");
  });

  it("should throw when both BYOK and app key return 404", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });

    await expect(
      resolveAnthropicKey({ clerkOrgId: "org_abc", callerContext })
    ).rejects.toThrow("No Anthropic key found");
  });

  it("should skip BYOK and use app key when no clerkOrgId", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ provider: "anthropic", key: "sk-ant-platform" }),
    });

    const result = await resolveAnthropicKey({ callerContext });

    expect(result).toEqual({ apiKey: "sk-ant-platform", usedByok: false });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toContain("/internal/app-keys/anthropic/decrypt");
  });

  it("should use default appId when none provided", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ provider: "anthropic", key: "sk-ant-default" }),
    });

    await resolveAnthropicKey({ callerContext });

    expect(fetchSpy.mock.calls[0][0]).toContain(
      "appId=reply-qualification-service"
    );
  });

  it("should throw when app key returns 404 and no clerkOrgId", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });

    await expect(resolveAnthropicKey({ callerContext })).rejects.toThrow(
      "No Anthropic key found"
    );
  });
});
