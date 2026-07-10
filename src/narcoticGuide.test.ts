import { describe, expect, it } from "vitest";
import { getNarcoticFloorRows, narcoticGuideLabel } from "./narcoticGuide";
import type { StockRoom } from "./types";

function room(id: string, label = id): StockRoom {
  return {
    id,
    label,
    sourceColumn: id,
    sourceSheet: "점검",
    sourceUpdatedAt: "",
    allocationCount: 0,
    totalQuantity: 0,
  };
}

describe("narcotic guide rooms", () => {
  it("shows room 42 on the fourth-floor row as 42W", () => {
    const rows = getNarcoticFloorRows("4층", [room("42", "42")]);

    expect(rows.map((row) => row.map((item) => item.id))).toEqual([["42"]]);
    expect(narcoticGuideLabel(room("42", "42"))).toBe("42W");
  });

  it("places RRT next to 92W in the 5th-to-12th-floor guide rows", () => {
    const rows = getNarcoticFloorRows("5층 ~ 12층", [room("91"), room("92"), room("RRT"), room("101")]);

    expect(rows.map((row) => row.map((item) => item.id))).toEqual([
      ["91", "92", "RRT"],
      ["101"],
    ]);
  });
});
