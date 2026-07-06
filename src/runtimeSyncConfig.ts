import { buildPwaAssetUrl } from "./pwa";

export type RuntimeSyncConfig = {
  apiBaseUrl: string;
  updatedAt?: string;
  source?: string;
};

export function normalizeSyncBaseUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;

  try {
    const url = new URL(trimmed);
    if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function loadRuntimeSyncConfig(baseUrl = import.meta.env.BASE_URL): Promise<RuntimeSyncConfig | null> {
  const response = await fetch(buildPwaAssetUrl(baseUrl, `sync-config.json?v=${Date.now()}`), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Sync config load failed (${response.status})`);

  const parsed = (await response.json()) as Partial<RuntimeSyncConfig>;
  const apiBaseUrl = normalizeSyncBaseUrl(parsed.apiBaseUrl);
  if (!apiBaseUrl) return null;

  return {
    apiBaseUrl,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    source: typeof parsed.source === "string" ? parsed.source : undefined,
  };
}
