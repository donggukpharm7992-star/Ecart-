import { afterEach, describe, expect, it, vi } from "vitest";
import { protectNarcoticLotAssignments } from "../vite.config";
import { buildAppStateApiUrl, configureServerSyncBaseUrl, saveServerState } from "./serverSync";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  configureServerSyncBaseUrl("/Ecart-/");
  vi.restoreAllMocks();
});

describe("server sync client", () => {
  it("builds the local app-state API URL under the Vite base path", () => {
    expect(buildAppStateApiUrl("/Ecart-/")).toBe("/Ecart-/api/app-state");
    expect(buildAppStateApiUrl("/")).toBe("/api/app-state");
  });

  it("uses the configured fixed sync server URL by default", () => {
    configureServerSyncBaseUrl("https://fixed-sync.example.com/Ecart-/");

    expect(buildAppStateApiUrl()).toBe("https://fixed-sync.example.com/Ecart-/api/app-state");
  });

  it("retries a transient save failure before surfacing an error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "temporary git push failure" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: "saved-after-retry" }), { status: 200 }));

    await expect(
      saveServerState(
        {
          version: 1,
          updatedAt: "2026-06-23T07:00:00.000Z",
          clientId: "phone",
          state: { room: "42W" },
        },
        { retryDelayMs: 0 },
      ),
    ).resolves.toEqual({ sha: "saved-after-retry" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("sends the server state sha that the local save is based on", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ sha: "next-sha" }), { status: 200 }));

    await saveServerState(
      {
        version: 1,
        updatedAt: "2026-06-23T07:00:00.000Z",
        clientId: "pc",
        state: { stockDrugs: [] },
      },
      { baseSha: "current-sha", retryDelayMs: 0 },
    );

    const request = vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      baseSha: "current-sha",
      envelope: {
        clientId: "pc",
        state: { stockDrugs: [] },
      },
    });
  });

  it("can force a device state upload for manual recovery", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ sha: "forced-sha" }), { status: 200 }));

    await saveServerState(
      {
        version: 1,
        updatedAt: "2026-06-23T07:00:00.000Z",
        clientId: "phone",
        state: { roundSummaryDraft: { rows: [] } },
      },
      { force: true, retryDelayMs: 0 },
    );

    const request = vi.mocked(globalThis.fetch).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      force: true,
      envelope: {
        clientId: "phone",
        state: { roundSummaryDraft: { rows: [] } },
      },
    });
  });
});

describe("app state sync protection", () => {
  it("keeps richer narcotic LOT assignments when a stale browser saves the same upload file", () => {
    const current = {
      version: 1,
      updatedAt: "2026-07-06T10:58:44.990Z",
      state: {
        narcoticLotFileName: "의약품_재고_상세_20260706.xls",
        narcoticLotAssignments: {
          "AN::XATIV4W": { roomLot: "ATIV4-LOT", pharmacyLot: "" },
          "ER::XKETA5W": { roomLot: "KETA-LOT", pharmacyLot: "" },
          "DRL::XNALB10": { roomLot: "", pharmacyLot: "" },
        },
      },
    };
    const incoming = {
      version: 1,
      updatedAt: "2026-07-06T11:19:06.047Z",
      state: {
        narcoticLotFileName: "의약품_재고_상세_20260706.xls",
        narcoticLotAssignments: {
          "AN::XATIV4W": { roomLot: "", pharmacyLot: "" },
          "ER::XKETA5W": { roomLot: "", pharmacyLot: "" },
          "DRL::XNALB10": { roomLot: "", pharmacyLot: "" },
        },
      },
    };

    expect(protectNarcoticLotAssignments(incoming, current)).toMatchObject({
      state: {
        narcoticLotAssignments: current.state.narcoticLotAssignments,
      },
    });
  });
});
