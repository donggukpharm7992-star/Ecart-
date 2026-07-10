import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGithubContentsUrl,
  decodeBase64Utf8,
  encodeBase64Utf8,
  loadRemoteState,
  shouldApplyRemoteState,
  shouldMarkLocalChange,
  shouldPushLocalState,
} from "./githubSync";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("github sync helpers", () => {
  it("builds the GitHub contents API URL for the shared state file", () => {
    expect(
      buildGithubContentsUrl({
        owner: "donggukpharm7992-star",
        repo: "Ecart-",
        branch: "main",
        path: "app-state/shared-state.json",
      }),
    ).toBe("https://api.github.com/repos/donggukpharm7992-star/Ecart-/contents/app-state%2Fshared-state.json?ref=main");
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

  it("keeps a newer local cache even after the app restarts", () => {
    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        localUpdatedAt: "2026-06-23T10:00:10.000Z",
        remoteClientId: "pc",
        clientId: "phone",
        hasUnsavedLocalChanges: false,
      }),
    ).toBe(false);
  });

  it("applies a newer remote state over an idle older local cache", () => {
    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:10.000Z",
        localUpdatedAt: "2026-06-23T10:00:05.000Z",
        remoteClientId: "pc",
        clientId: "phone",
        hasUnsavedLocalChanges: false,
      }),
    ).toBe(true);
  });

  it("applies a changed server revision from another PC even when that PC clock is behind", () => {
    expect(
      shouldApplyRemoteState({
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        localUpdatedAt: "2026-06-23T10:00:10.000Z",
        remoteClientId: "narcotic-viewer-pc",
        clientId: "admin-pc",
        hasUnsavedLocalChanges: false,
        remoteRevisionChanged: true,
      }),
    ).toBe(true);
  });

  it("pushes local state only when this session has unsaved edits", () => {
    expect(
      shouldPushLocalState({
        localUpdatedAt: "2026-06-23T10:00:10.000Z",
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        hasUnsavedLocalChanges: true,
      }),
    ).toBe(true);

    expect(
      shouldPushLocalState({
        localUpdatedAt: "2026-06-23T10:00:10.000Z",
        remoteUpdatedAt: "2026-06-23T10:00:05.000Z",
        hasUnsavedLocalChanges: false,
      }),
    ).toBe(false);
  });

  it("does not mark startup or remote-apply changes as local edits", () => {
    expect(shouldMarkLocalChange({ syncInitialized: false, applyingRemote: false })).toBe(false);
    expect(shouldMarkLocalChange({ syncInitialized: true, applyingRemote: true })).toBe(false);
    expect(shouldMarkLocalChange({ syncInitialized: true, applyingRemote: false })).toBe(true);
  });

  it("times out stalled GitHub load requests", async () => {
    globalThis.fetch = vi.fn((_url, init) => {
      const signal = (init as RequestInit | undefined)?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });

    await expect(
      loadRemoteState(
        {
          owner: "donggukpharm7992-star",
          repo: "Ecart-",
          branch: "main",
          path: "app-state/shared-state.json",
          token: "secret",
        },
        { timeoutMs: 1 },
      ),
    ).rejects.toThrow("GitHub 요청 시간이 초과");
  });
});
