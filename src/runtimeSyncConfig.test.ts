import { afterEach, describe, expect, it, vi } from "vitest";
import { loadRuntimeSyncConfig, normalizeSyncBaseUrl } from "./runtimeSyncConfig";

const originalFetch = globalThis.fetch;
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  vi.restoreAllMocks();
});

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  return store;
}

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

  it("keeps the last working sync server address when the deployed config is missing", async () => {
    installLocalStorage({
      "hospital-inventory-runtime-sync-config-v1": JSON.stringify({
        apiBaseUrl: "https://stored.trycloudflare.com/Ecart-/",
        updatedAt: "2026-07-06T01:00:00.000Z",
        source: "cloudflare-quick-tunnel",
      }),
    });
    globalThis.fetch = vi.fn().mockResolvedValueOnce(new Response("", { status: 404 }));

    await expect(loadRuntimeSyncConfig("/Ecart-/")).resolves.toEqual({
      apiBaseUrl: "https://stored.trycloudflare.com/Ecart-/",
      updatedAt: "2026-07-06T01:00:00.000Z",
      source: "cloudflare-quick-tunnel",
    });
  });

  it("stores a successfully loaded sync server address for installed apps", async () => {
    const store = installLocalStorage();
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          apiBaseUrl: "https://fresh.trycloudflare.com/Ecart-/",
          updatedAt: "2026-07-07T01:00:00.000Z",
          source: "cloudflare-quick-tunnel",
        }),
        { status: 200 },
      ),
    );

    await loadRuntimeSyncConfig("/Ecart-/");

    expect(JSON.parse(store.get("hospital-inventory-runtime-sync-config-v1") ?? "{}")).toMatchObject({
      apiBaseUrl: "https://fresh.trycloudflare.com/Ecart-/",
    });
  });
});
