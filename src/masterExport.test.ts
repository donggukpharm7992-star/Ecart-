import { describe, expect, it } from "vitest";
import type { MasterRow } from "./inventoryState";
import { buildMasterExportFileName, buildMasterExportRows, createMasterWorkbookXlsx } from "./masterExport";

const rows: MasterRow[] = [
  {
    code: "XAAA",
    genericName: "Alpha",
    productName: "Alpha inj",
    spec: "1V",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    masterKind: "stock",
    totalQuantity: 5,
    roomDetails: [
      { roomId: "42W", requiredQty: 2 },
      { roomId: "61W", requiredQty: 3 },
    ],
  },
  {
    code: "XBBB",
    genericName: "Beta",
    productName: "Beta inj",
    spec: "1A",
    storage: "냉장보관(2-8℃)",
    note: "",
    warning: "고위험의약품",
    storageType: "REFRIGERATED",
    masterKind: "stock",
    totalQuantity: 1,
    roomDetails: [{ roomId: "42W", requiredQty: 1 }],
  },
];

describe("master inventory Excel export", () => {
  it("separates drug name and storage method for the master export rows", () => {
    expect(buildMasterExportRows(rows)).toEqual([
      {
        code: "XAAA",
        drugName: "Alpha inj",
        genericName: "Alpha",
        spec: "1V",
        storageMethod: "실온보관",
        storageLabel: "실온",
        warning: "",
        roomQuantities: "42W 2, 61W 3",
        totalQuantity: 5,
      },
      {
        code: "XBBB",
        drugName: "Beta inj",
        genericName: "Beta",
        spec: "1A",
        storageMethod: "냉장보관(2-8℃)",
        storageLabel: "냉장",
        warning: "고위험의약품",
        roomQuantities: "42W 1",
        totalQuantity: 1,
      },
    ]);
  });

  it("creates an xlsx workbook containing the master stock headers", () => {
    const workbook = createMasterWorkbookXlsx(rows);
    const text = new TextDecoder().decode(workbook);

    expect(workbook[0]).toBe(0x50);
    expect(workbook[1]).toBe(0x4b);
    expect(text).toContain("전체 비품약 마스터 보유 현황");
    expect(text).toContain("약품명");
    expect(text).toContain("보관방법");
    expect(text).toContain("냉장");
  });

  it("uses the requested master export file name", () => {
    expect(buildMasterExportFileName("2026-06-26")).toBe("전체비품약 마스터 보유 현황_2026-06-26.xlsx");
  });
});
