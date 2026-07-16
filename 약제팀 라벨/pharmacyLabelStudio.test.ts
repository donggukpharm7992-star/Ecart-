import { describe, expect, it } from "vitest";
import {
  A4_PAPER,
  createPharmacyLabelDraft,
  groupPharmacyLabelsForPaper,
  rowMatchesCategory,
  resolvePharmacyLabelDraft,
  savePharmacyLabelDraft,
  sizesForCategory,
  splitDoseText,
  splitNutritionDoseParts,
  splitNutritionDoseText,
  splitStyledPharmacyTitle,
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
      expect.arrayContaining(["23x102", "10x27", "15x30"]),
    );
  });

  it("provides both syrup label dimensions", () => {
    expect(sizesForCategory("시럽", row).map((size) => size.presetKey)).toEqual(["48x94", "15x90"]);
  });

  it("splits selected common-name text into independently styled segments", () => {
    expect(splitStyledPharmacyTitle("Propess vaginal", [{ start: 0, end: 7, color: "#ff0000", textTransform: "uppercase" }])).toEqual([
      { text: "PROPESS", style: expect.objectContaining({ color: "#ff0000", textTransform: "uppercase" }) },
      { text: " vaginal", style: undefined },
    ]);
  });

  it("highlights only the numeric dose inside the common name", () => {
    expect(splitDoseText("Synagis 100mg/ml inj")).toEqual({
      before: "Synagis ",
      dose: "100",
      after: "mg/ml inj",
    });
  });

  it("highlights the final nutrition-fluid volume and adds the designated Ntense dose check", () => {
    expect(splitNutritionDoseText("SMOFlipid 20% 500ml inj")).toEqual({
      before: "SMOFlipid 20% ",
      dose: "500",
      after: "ml inj",
    });
    const ntense = createPharmacyLabelDraft({
      ...row,
      name: "Ntense central 1518mL inj",
      drugType: "영양수액",
      doseCaution: false,
      doseCheck: false,
    }, "영양수액", "drug");
    expect(ntense.warnings).toContain("용량확인");
  });

  it("highlights every concentration and volume number in Citopcin nutrition labels", () => {
    expect(splitNutritionDoseParts("CITOPCIN 400mg/200ml inj").filter((part) => part.highlighted).map((part) => part.text)).toEqual(["400", "200"]);
    expect(splitNutritionDoseParts("Citopcin 200mg/100ml inj").filter((part) => part.highlighted).map((part) => part.text)).toEqual(["200", "100"]);
  });

  it("refreshes image, ATC, and expiry values from the workbook over saved labels", () => {
    const saved = savePharmacyLabelDraft({
      ...createPharmacyLabelDraft(row, "바이알", "drug"),
      imagePath: "old.png",
      atc: "OLD",
      expiry: "2025-01-01",
    });
    const resolved = resolvePharmacyLabelDraft({
      ...row,
      imagePath: "pharmacy-drug-images/new.png",
      imageSourceUrl: "https://www.health.kr/new",
      atc: "191",
      expiry: "2027-12-31",
    }, [saved], "바이알", "drug");
    expect(resolved.imagePath).toBe("pharmacy-drug-images/new.png");
    expect(resolved.atc).toBe("191");
    expect(resolved.expiry).toBe("2027-12-31");
  });

  it("keeps manually saved border colors as the final default", () => {
    const saved = savePharmacyLabelDraft({
      ...createPharmacyLabelDraft(row, "바이알", "drug"),
      style: {
        ...createPharmacyLabelDraft(row, "바이알", "drug").style,
        outerBorderColor: "#22C55E",
      },
    });
    const resolved = resolvePharmacyLabelDraft({ ...row, borderColor: "#D92D20" }, [saved], "바이알", "drug");
    expect(resolved.style.outerBorderColor).toBe("#22C55E");
  });

  it("keeps manually saved warning selections as the next default", () => {
    const saved = savePharmacyLabelDraft({
      ...createPharmacyLabelDraft(row, "바이알", "drug"),
      warnings: ["용량확인"],
    });
    const resolved = resolvePharmacyLabelDraft(row, [saved], "바이알", "drug");
    expect(resolved.warnings).toEqual(["용량확인"]);
    expect(resolved.printable.warning).toBe("용량확인");
  });

  it("creates high-risk warning and footer content", () => {
    const draft = createPharmacyLabelDraft(row, "바이알", "drug");
    expect(draft.printable.warning).toContain("고위험의약품");
    expect(draft.printable.footer.text).toBe("고농도 전해질");
  });

  it("uses a 0.5mm default border while preserving designated and high-cost 5mm borders", () => {
    expect(createPharmacyLabelDraft({ ...row, border: false, borderColor: "" }, "원병", "drug").style.outerBorderPx).toBe(0.5);
    expect(createPharmacyLabelDraft(row, "바이알", "drug").style.outerBorderPx).toBe(5);
    expect(createPharmacyLabelDraft({ ...row, border: false, highCost: true }, "고가약", "drug").style.outerBorderPx).toBe(5);
    const colorDesignated = createPharmacyLabelDraft({ ...row, border: false, borderColor: "기호 #15A7E6" }, "바이알", "drug");
    expect(colorDesignated.style.outerBorderPx).toBe(5);
    expect(colorDesignated.style.outerBorderColor).toBe("#15A7E6");
  });

  it("groups labels for batch print", () => {
    const draft = createPharmacyLabelDraft(row, "바이알", "drug");
    expect(groupPharmacyLabelsForPaper(Array.from({ length: 30 }, () => draft), A4_PAPER).length).toBeGreaterThan(1);
  });
});
