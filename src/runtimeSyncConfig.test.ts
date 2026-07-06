import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRuntimeSyncConfig, normalizeSyncBaseUrl } from "./runtimeSyncConfig";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("runtime sync config", () => {
  it("normalizes fixed sync server base URLs", () => {
    expect(normalizeSyncBaseUrl("https://example.trycloudflare.com/Ecart-")).toBe("https://example.trycloudflare.com/Ecart-/");
    expect(normalizeSyncBaseUrl("/Ecart-/")).toBeUndefined();
  });

  it("loads the current sync server address from the fixed app host", async () => {
    vi.spyOn(Date, "now").mockReturnValue(2026070601);
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          apiBaseUrl: "https://example.trycloudflare.com/Ecart-/",
          updatedAt: "2026-07-06T01:00:00.000Z",
          source: "cloudflare-quick-tunnel",
        }),
        { status: 200 },
      ),
    );

    await expect(loadRuntimeSyncConfig("/Ecart-/")).resolves.toEqual({
      apiBaseUrl: "https://example.trycloudflare.com/Ecart-/",
      updatedAt: "2026-07-06T01:00:00.000Z",
      source: "cloudflare-quick-tunnel",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith("/Ecart-/sync-config.json?v=2026070601", { cache: "no-store" });
  });
});
