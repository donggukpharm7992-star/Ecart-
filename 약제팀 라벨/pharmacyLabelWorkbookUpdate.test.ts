import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./pharmacyLabelWorkbookUpdate.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

describe("pharmacy label workbook update", () => {
  it("writes edited warnings and border settings to a downloaded hospital workbook", () => {
    expect(source).toContain('이름주의: "이름주의"');
    expect(source).toContain('"테두리 색기호": draft.style.outerBorderColor');
    expect(source).toContain('draft.style.outerBorderPx >= 5 ? "Y" : "N"');
    expect(source).toContain('XLSX.writeFile(workbook, "원내보유의약품리스트.xlsx"');
  });

  it("updates the current app row and local final-label repository after workbook save", () => {
    expect(appSource).toContain("savePharmacyLabelDraftToWorkbook");
    expect(appSource).toContain("savePharmacyLabelToStorage");
    expect(appSource).toContain("nameCaution: draft.warnings.includes");
    expect(appSource).toContain("borderColor: draft.style.outerBorderColor");
  });
});
