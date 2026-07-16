import { describe, expect, it } from "vitest";
import {
  A4_PAPER,
  createPharmacyLabelDraft,
  groupPharmacyLabelsForPaper,
  rowMatchesCategory,
  sizesForCategory,
} from "./pharmacyLabelStudio";
import type { HospitalDrugLabelRow } from "./hospitalDrugLabels";

const row: HospitalDrugLabelRow = {
  code: "XTEST",
  itemCode: "8800000000000",
  name: "Test drug 10mg inj",
  koreanName: "테스트주",
  strength: "10 mg",
  drugType: "바이알",
  highCost: false,
  spec: "1 via",
  package: "1 via",
  storage: "냉장",
  lightProtected: true,
  inHospital: true,
  oralAnticancer: false,
  similarLook: false,
  similarSound: false,
  doseCaution: true,
  doseCheck: false,
  highRisk: true,
  highRiskCategory: "고농도 전해질",
  atc: "",
  nameCaution: false,
  border: true,
  borderColor: "#d92d20",
};

describe("pharmacy label studio rules", () => {
  it("filters by workbook drug type", () => {
    expect(rowMatchesCategory(row, "바이알")).toBe(true);
    expect(rowMatchesCategory(row, "PTP")).toBe(false);
  });

  it("splits high-cost drugs into injection and oral choices", () => {
    expect(rowMatchesCategory({ ...row, highCost: true }, "고가약", "주사")).toBe(true);
    expect(rowMatchesCategory({ ...row, highCost: true }, "고가약", "경구")).toBe(false);
    expect(rowMatchesCategory({ ...row, highCost: true, drugType: "원병" }, "고가약", "경구")).toBe(true);
  });

  it("limits bordered vial labels to bordered sizes", () => {
    expect(sizesForCategory("바이알", row).every((size) => size.heightMm > 40)).toBe(true);
  });

  it("uses corrected side and cap dimensions", () => {
    expect(sizesForCategory("원병", row).map((size) => size.presetKey)).toEqual(
      expect.arrayContaining(["220x102", "10x27", "15x30"]),
    );
  });

  it("creates high-risk warning and footer content", () => {
    const draft = createPharmacyLabelDraft(row, "바이알", "drug");
    expect(draft.printable.warning).toContain("고위험의약품");
    expect(draft.printable.footer.text).toBe("고농도 전해질");
  });

  it("groups labels for batch print", () => {
    const draft = createPharmacyLabelDraft(row, "바이알", "drug");
    expect(groupPharmacyLabelsForPaper(Array.from({ length: 30 }, () => draft), A4_PAPER).length).toBeGreaterThan(1);
  });
});
