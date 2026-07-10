import { describe, expect, it } from "vitest";
import { buildNarcoticStateChangeSummary } from "./narcoticStateDiff";
import type { StockDrug } from "./types";

const midazolam: StockDrug = {
  code: "XMIDZ5W",
  genericName: "Midazolam",
  productName: "Midazolam 5mg",
  spec: "5mg",
  storage: "실온보관",
  note: "",
  warning: "",
  storageType: "ROOM",
};

describe("narcotic state change summary", () => {
  it("lists allocation deletion and quantity changes before admin applies viewer edits", () => {
    const summary = buildNarcoticStateChangeSummary(
      {
        narcoticDrugs: [midazolam],
        narcoticAllocations: [
          { roomId: "DREMM", drugCode: "XMIDZ5W", requiredQty: 10 },
          { roomId: "42", drugCode: "XMIDZ5W", requiredQty: 3 },
        ],
      },
      {
        narcoticDrugs: [midazolam],
        narcoticAllocations: [{ roomId: "42", drugCode: "XMIDZ5W", requiredQty: 5 }],
      },
    );

    expect(summary).toContain("삭제: DREMM Midazolam 5mg 10개 -> 0개");
    expect(summary).toContain("수량 변경: 42 Midazolam 5mg 3개 -> 5개");
  });

  it("summarizes checklist and lot changes", () => {
    const summary = buildNarcoticStateChangeSummary(
      {
        narcoticCheckedItems: { "DREMM::XMIDZ5W": true },
        narcoticLotAssignments: { DREMM: { XMIDZ5W: "A1" } },
      },
      {
        narcoticCheckedItems: { "DREMM::XMIDZ5W": false },
        narcoticLotAssignments: { DREMM: { XMIDZ5W: "B2" } },
      },
    );

    expect(summary).toContain("점검 체크 변경: 1건");
    expect(summary).toContain("LOT 변경: 1건");
  });
});
