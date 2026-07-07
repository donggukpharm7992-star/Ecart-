import { describe, expect, it } from "vitest";
import {
  buildInspectionCycleResetRoundSummaryDraft,
  buildNarcoticRoundSummaryDraft,
  buildRoundSummaryDraft,
  materializeRoundSummaryDraft,
  refreshRoundSummaryDraftFromGenerated,
  summarizeChecklistIssues,
} from "./roundSummary";

describe("round summary draft", () => {
  it("summarizes only manual notes and bad checklist rows", () => {
    const issues = summarizeChecklistIssues([
      { section: "비품약", text: "정상 확인 항목", status: "good", note: "" },
      { section: "비품약", text: "수량 일치", status: "bad", note: "잉여 약품 약제팀 반납 안내" },
      { section: "E-cart", text: "봉인지 확인", status: "bad", note: "" },
    ]);

    expect(issues).toEqual(["잉여 약품 약제팀 반납 안내", "봉인지 확인 확인 필요"]);
  });

  it("builds a concise editable draft in the uploaded form shape", () => {
    const draft = buildRoundSummaryDraft({
      inspectionPeriod: "2026년 3월 2일 ~ 3월 9일",
      stockRooms: [
        {
          id: "42W",
          label: "42병동",
          stockChecklist: [{ section: "비품약", text: "비품약 수량 일치", status: "bad", note: "수량 재확인 안내" }],
          ecartChecklist: [{ section: "E-cart", text: "하단 서랍 확인", status: "bad", note: "하단 서랍 물품 위치 재확인 안내" }],
        },
      ],
      ecartOnlyTargets: [
        {
          id: "CT실",
          label: "CT실",
          checklist: [{ section: "E-cart", text: "봉인지 확인", status: "good", note: "" }],
        },
      ],
      commonGuidance: "공통 안내",
    });

    expect(draft.title).toBe("병동 순회 점검표");
    expect(draft.rows).toEqual([
      {
        id: "stock:42W",
        roomName: "42병동",
        result: "확인 필요",
        details: "비품약: 수량 재확인 안내\nE-cart: 하단 서랍 물품 위치 재확인 안내",
      },
      {
        id: "ecart:CT실",
        roomName: "CT실",
        result: "적합",
        details: "적합",
      },
    ]);
  });

  it("does not repeat the same linked checklist note under stock and E-cart", () => {
    const draft = buildRoundSummaryDraft({
      inspectionPeriod: "2026-07",
      stockRooms: [
        {
          id: "42W",
          label: "42병동",
          stockChecklist: [{ section: "비품약", text: "수량 일치", status: "bad", note: "수량 재확인 필요" }],
          ecartChecklist: [{ section: "E-cart", text: "봉인지 확인", status: "bad", note: "수량 재확인 필요" }],
        },
      ],
      ecartOnlyTargets: [],
      commonGuidance: "안내",
    });

    expect(draft.rows[0].details).toBe("비품약: 수량 재확인 필요");
  });

  it("resets editable issue text while preserving row order, room names, and 91W non-operating result", () => {
    const previousDraft = {
      title: "병동 순회 점검표",
      inspectionPeriod: "이전 기간",
      commonGuidance: "이전 안내",
      closingNote: "이전 마무리",
      rows: [
        { id: "stock:91W", roomName: "91W", result: "미운영", details: "미운영" },
        { id: "stock:42W", roomName: "42병동", result: "확인 필요", details: "비품약: 수기 지적 내용" },
      ],
    };
    const generatedDraft = {
      title: "병동 순회 점검표",
      inspectionPeriod: "새 기간",
      commonGuidance: "새 안내",
      closingNote: "새 마무리",
      rows: [
        { id: "stock:42W", roomName: "42병동", result: "적합", details: "적합" },
        { id: "stock:91W", roomName: "91W", result: "적합", details: "적합" },
      ],
    };

    const resetDraft = buildInspectionCycleResetRoundSummaryDraft(previousDraft, generatedDraft);

    expect(resetDraft.rows).toEqual([
      { id: "stock:91W", roomName: "91W", result: "미운영", details: "미운영" },
      { id: "stock:42W", roomName: "42병동", result: "적합", details: "적합" },
    ]);
    expect(resetDraft.inspectionPeriod).toBe("새 기간");
    expect(resetDraft.commonGuidance).toBe("새 안내");
  });

  it("builds a narcotic round summary from inventory checks and checklist issues", () => {
    const draft = buildNarcoticRoundSummaryDraft({
      inspectionPeriod: "2026년 7월 3일",
      rooms: [
        {
          id: "42",
          label: "42병동",
          inventoryItems: [
            { code: "XATIV2W", name: "Ativan 2mg inj", quantity: 1, checked: false, expiryDate: "" },
            { code: "XMIDZ5W", name: "Midazolam 5mg/5ml Inj", quantity: 1, checked: true, expiryDate: "2026-08-01" },
          ],
          checklist: [
            { section: "마약류 관리", text: "수량 이상 없음", status: "bad", note: "시건 장치 재확인 필요" },
            { section: "마약류 관리", text: "보관 양호", status: "good", note: "양호 항목 수기 메모" },
          ],
        },
      ],
      commonGuidance: "점검 사항\n1. 수량 이상 없음",
    });

    expect(draft.title).toBe("비치마약류 순회점검표");
    expect(draft.rows).toEqual([
      {
        id: "narcotic:42",
        roomName: "42병동",
        result: "확인 필요",
        details:
          "비치마약류 보유 현황: Midazolam 5mg/5ml Inj(XMIDZ5W) 3개월 미만 2026-08-01\n점검 사항: 시건 장치 재확인 필요",
      },
    ]);
    expect(draft.commonGuidance).toBe("점검 사항\n1. 수량 이상 없음");
    expect(draft.closingNote).toBe("간호부의 지속적이고 적극적인 협조 항상 감사드립니다.");
  });

  it("materializes a generated draft without sharing editable row references", () => {
    const generatedDraft = {
      title: "Generated",
      inspectionPeriod: "2026-07",
      commonGuidance: "Guide",
      closingNote: "Close",
      rows: [{ id: "narcotic:42", roomName: "42W", result: "OK", details: "generated" }],
    };

    const draft = materializeRoundSummaryDraft(null, generatedDraft);
    draft.rows[0].details = "edited";

    expect(draft).not.toBe(generatedDraft);
    expect(draft.rows[0]).not.toBe(generatedDraft.rows[0]);
    expect(generatedDraft.rows[0].details).toBe("generated");
  });

  it("keeps an existing draft when materializing", () => {
    const existingDraft = {
      title: "Existing",
      inspectionPeriod: "2026-07",
      commonGuidance: "Guide",
      closingNote: "Close",
      rows: [{ id: "narcotic:42", roomName: "42W", result: "Needs review", details: "manual memo" }],
    };
    const generatedDraft = {
      ...existingDraft,
      title: "Generated",
      rows: [{ id: "narcotic:42", roomName: "42W", result: "OK", details: "generated" }],
    };

    expect(materializeRoundSummaryDraft(existingDraft, generatedDraft)).toBe(existingDraft);
  });

  it("refreshes stored narcotic draft rows from the latest generated checklist result", () => {
    const storedDraft = {
      title: "Narcotic summary",
      inspectionPeriod: "2026-07",
      commonGuidance: "Guide",
      closingNote: "Close",
      rows: [{ id: "narcotic:DREMM", roomName: "DREMM", result: "OK", details: "OK" }],
    };
    const generatedDraft = {
      ...storedDraft,
      rows: [{ id: "narcotic:DREMM", roomName: "DREMM", result: "Needs review", details: "Checklist: Fvfjfj" }],
    };

    const refreshed = refreshRoundSummaryDraftFromGenerated(storedDraft, generatedDraft);

    expect(refreshed.rows[0]).toEqual({
      id: "narcotic:DREMM",
      roomName: "DREMM",
      result: "Needs review",
      details: "Checklist: Fvfjfj",
    });
  });
});
