import { buildPwaAssetUrl } from "./pwa";

export type RuntimeSyncConfig = {
  apiBaseUrl: string;
  updatedAt?: string;
  source?: string;
};

const RUNTIME_SYNC_CONFIG_STORAGE_KEY = "hospital-inventory-runtime-sync-config-v1";

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

function loadStoredRuntimeSyncConfig(): RuntimeSyncConfig | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const raw = globalThis.localStorage.getItem(RUNTIME_SYNC_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RuntimeSyncConfig>;
    const apiBaseUrl = normalizeSyncBaseUrl(parsed.apiBaseUrl);
    if (!apiBaseUrl) return null;
    return {
      apiBaseUrl,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
      source: typeof parsed.source === "string" ? parsed.source : undefined,
    };
  } catch {
    return null;
  }
}

function saveStoredRuntimeSyncConfig(config: RuntimeSyncConfig) {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    globalThis.localStorage.setItem(RUNTIME_SYNC_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage failures; sync can still use the freshly loaded config.
  }
}

export async function loadRuntimeSyncConfig(baseUrl = import.meta.env.BASE_URL): Promise<RuntimeSyncConfig | null> {
  const response = await fetch(buildPwaAssetUrl(baseUrl, `sync-config.json?v=${Date.now()}`), { cache: "no-store" });
  if (response.status === 404) return loadStoredRuntimeSyncConfig();
  if (!response.ok) throw new Error(`Sync config load failed (${response.status})`);

  const parsed = (await response.json()) as Partial<RuntimeSyncConfig>;
  const apiBaseUrl = normalizeSyncBaseUrl(parsed.apiBaseUrl);
  if (!apiBaseUrl) return loadStoredRuntimeSyncConfig();

  const config = {
    apiBaseUrl,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    source: typeof parsed.source === "string" ? parsed.source : undefined,
  };
  saveStoredRuntimeSyncConfig(config);
  return config;
}
