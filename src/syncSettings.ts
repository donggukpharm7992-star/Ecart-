export type StoredSyncConfig = {
  enabled: boolean;
  token: string;
};

export type SyncSettingsResult = {
  config: StoredSyncConfig;
  mode: "syncing" | "error";
  message: string;
};

export function createStoredSyncConfig(tokenDraft: string): SyncSettingsResult {
  const token = tokenDraft.trim();
  if (!token) {
    return {
      config: { enabled: false, token: "" },
      mode: "error",
      message: "GitHub 토큰을 입력해야 자동 저장이 켜집니다.",
    };
  }

  return {
    config: { enabled: true, token },
    mode: "syncing",
    message: "자동 저장 연결 중...",
  };
}
