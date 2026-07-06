import { describe, expect, it } from "vitest";
import { loadPharmacyLabelMatchRows, matchesPharmacyLabelMatch, splitMatchedLabelCandidates } from "./pharmacyLabelMatches";

describe("pharmacy label match source", () => {
  it("loads label matching rows generated from the matching workbook", async () => {
    const rows = await loadPharmacyLabelMatchRows();
    const atropine = rows.find((row) => row.code === "A.01W-T");

    expect(rows.length).toBeGreaterThan(700);
    expect(atropine?.matchStatus).toBe("확정");
    expect(atropine?.matchedLabel).toContain("Atropine");
    expect(atropine?.sourceFile).toContain("xlsx");
  });

  it("splits multiple workbook candidates without exposing empty entries", () => {
    expect(splitMatchedLabelCandidates("A---B\n---\nC")).toEqual(["A", "B", "C"]);
    expect(splitMatchedLabelCandidates("")).toEqual([]);
  });

  it("matches by code, Korean name, English name, and matched label text", () => {
    const row = {
      code: "A.01W-T",
      englishName: "Atropine oph 0.01% 5mL",
      koreanName: "아트로핀",
      strength: "0.01%",
      spec: "5mL",
      package: "",
      storage: "차광",
      matchedLabel: "Atropine oph 0.01% 5ml 아트로핀 0.01% 점안액",
    };

    expect(matchesPharmacyLabelMatch(row, "A.01W-T")).toBe(true);
    expect(matchesPharmacyLabelMatch(row, "아트로핀")).toBe(true);
    expect(matchesPharmacyLabelMatch(row, "atropine")).toBe(true);
    expect(matchesPharmacyLabelMatch(row, "점안액")).toBe(true);
    expect(matchesPharmacyLabelMatch(row, "없는약")).toBe(false);
  });
});
