import { describe, expect, it } from "vitest";
import { buildGithubContentsUrl, decodeBase64Utf8, encodeBase64Utf8, shouldApplyRemoteState } from "./githubSync";

describe("github sync helpers", () => {
  it("builds the GitHub contents API URL for the shared state file", () => {
    expect(
      buildGithubContentsUrl({
        owner: "oleroseparosc-code",
        repo: "Ecart-",
        branch: "main",
        path: "app-state/shared-state.json",
      }),
    ).toBe("https://api.github.com/repos/oleroseparosc-code/Ecart-/contents/app-state%2Fshared-state.json?ref=main");
  });

  it("round-trips Korean JSON through base64", () => {
    const text = JSON.stringify({ room: "HBEF심혈관조영실", note: "수량 확인" });

    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text);
  });

  it("applies only newer remote state from another client", () => {
    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        localUpdatedAt: "2026-06-23T10:00:00.000Z",
        remoteClientId: "phone",
        clientId: "pc",
      }),
    ).toBe(true);

    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:00.000Z",
        localUpdatedAt: "2026-06-23T10:00:05.000Z",
        remoteClientId: "phone",
        clientId: "pc",
      }),
    ).toBe(false);

    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        localUpdatedAt: "2026-06-23T10:00:00.000Z",
        remoteClientId: "pc",
        clientId: "pc",
      }),
    ).toBe(false);
  });
});
