import { describe, expect, it } from "vitest";
import { createStoredSyncConfig } from "./syncSettings";

describe("sync settings", () => {
  it("does not enable automatic saving without a token", () => {
    expect(createStoredSyncConfig("   ")).toEqual({
      config: { enabled: false, token: "" },
      message: "GitHub 토큰을 입력해야 자동 저장이 켜집니다.",
      mode: "error",
    });
  });

  it("enables automatic saving with a trimmed token and connecting status", () => {
    expect(createStoredSyncConfig("  token-value  ")).toEqual({
      config: { enabled: true, token: "token-value" },
      message: "자동 저장 연결 중...",
      mode: "syncing",
    });
  });
});
