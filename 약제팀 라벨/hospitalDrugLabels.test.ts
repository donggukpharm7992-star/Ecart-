import { describe, expect, it } from "vitest";
import {
  getHospitalDrugControlledCategory,
  getHospitalDrugLabelWarnings,
  getHospitalDrugStorageLabel,
  isHospitalControlledDrugType,
  isHospitalGeneralDrugLabelType,
  isHospitalDrugType,
  isHospitalDrugLightProtected,
  isSelectableHospitalDrugLabelRow,
  loadHospitalDrugLabelRows,
  matchesHospitalDrugLabel,
  shouldExcludeHospitalControlledDrugLabel,
  stripHospitalDrugControlledPrefix,
} from "./hospitalDrugLabels";

describe("hospital drug label source", () => {
  it("loads all drug label candidates from the hospital drug workbook", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");
    const albumin = rows.find((row) => row.code === "X20AL1S");

    expect(rows.length).toBeGreaterThan(2700);
    expect(abilify?.name).toBe("Abilify asimtufii 720mg inj");
    expect(albumin?.name).toBe("Albumin(SK) 20% 100ml inj");
  });

  it("keeps the workbook drug type used by label source buttons", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const fluids = rows.filter((row) => isHospitalDrugType(row, "일반수액") && isSelectableHospitalDrugLabelRow(row));
    const controlled = rows.filter((row) => isHospitalControlledDrugType(row) && isSelectableHospitalDrugLabelRow(row));

    expect(rows.find((row) => row.code === "XAQD")?.drugType).toBe("일반수액");
    expect(fluids.length).toBeGreaterThanOrEqual(30);
    expect(controlled.length).toBeGreaterThanOrEqual(70);
    expect(controlled.every((row) => row.drugType === "마약" || row.drugType === "향정")).toBe(true);
  });

  it("selects only in-hospital rows with real common names for label lists", () => {
    const base = {
      code: "XVALID",
      name: "Valid common name",
      koreanName: "테스트",
      strength: "",
      drugType: "바이알",
      spec: "",
      package: "",
      storage: "",
      lightProtected: false,
      highRisk: false,
      inHospital: true,
      similarLook: false,
      similarSound: false,
      doseCaution: false,
    };

    expect(isSelectableHospitalDrugLabelRow(base)).toBe(true);
    expect(isSelectableHospitalDrugLabelRow({ ...base, inHospital: false })).toBe(false);
    expect(isSelectableHospitalDrugLabelRow({ ...base, drugType: "" })).toBe(false);
    expect(isSelectableHospitalDrugLabelRow({ ...base, name: "607" })).toBe(false);
    expect(isSelectableHospitalDrugLabelRow({ ...base, name: "" })).toBe(false);
  });

  it("keeps general drug labels to typed in-hospital drugs except fluids and controlled drugs", () => {
    expect(isHospitalGeneralDrugLabelType({ drugType: "바이알" })).toBe(true);
    expect(isHospitalGeneralDrugLabelType({ drugType: "냉장주사" })).toBe(true);
    expect(isHospitalGeneralDrugLabelType({ drugType: "" })).toBe(false);
    expect(isHospitalGeneralDrugLabelType({ drugType: "일반수액" })).toBe(false);
    expect(isHospitalGeneralDrugLabelType({ drugType: "마약" })).toBe(false);
    expect(isHospitalGeneralDrugLabelType({ drugType: "향정" })).toBe(false);
  });

  it("builds the general drug label source from all typed in-hospital non-fluid non-controlled rows", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const generalRows = rows.filter((row) => isSelectableHospitalDrugLabelRow(row) && isHospitalGeneralDrugLabelType(row));

    expect(generalRows.length).toBeGreaterThan(80);
    expect(generalRows.every((row) => row.drugType.trim().length > 0)).toBe(true);
    expect(generalRows.some((row) => row.drugType === "일반수액")).toBe(false);
    expect(generalRows.some((row) => row.drugType === "마약" || row.drugType === "향정")).toBe(false);
  });

  it("uses workbook storage, light protection, and caution columns for labels", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");
    const albumin = rows.find((row) => row.code === "X20AL1S");
    const lantusVial = rows.find((row) => row.code === "XIGLY10");

    expect(abilify && isHospitalDrugLightProtected(abilify)).toBe(true);
    expect(abilify && getHospitalDrugStorageLabel(abilify)).toBe("");
    expect(abilify && getHospitalDrugLabelWarnings(abilify)).toContain("차광");
    expect(albumin && getHospitalDrugLabelWarnings(albumin)).toContain("용량주의");
    expect(lantusVial?.highRisk).toBe(true);
    expect(lantusVial && getHospitalDrugStorageLabel(lantusVial)).toBe("냉장");
    expect(lantusVial && getHospitalDrugLabelWarnings(lantusVial)).toContain("고위험의약품");
  });

  it("shows light protection as a caution and only cold or frozen storage as storage labels", () => {
    const row = {
      code: "XLID1",
      name: "1% Lidocaine HCI 20ml inj",
      koreanName: "휴온스리도카인염산수화물주1% 20ml",
      strength: "200 mg",
      drugType: "",
      spec: "20 ml",
      package: "1 via",
      storage: "실온",
      lightProtected: true,
      highRisk: false,
      inHospital: true,
      similarLook: false,
      similarSound: false,
      doseCaution: false,
    };

    expect(getHospitalDrugStorageLabel(row)).toBe("");
    expect(getHospitalDrugLabelWarnings(row)).toContain("차광");
    expect(getHospitalDrugStorageLabel({ ...row, storage: "냉장" })).toBe("냉장");
    expect(getHospitalDrugStorageLabel({ ...row, storage: "냉동" })).toBe("냉동");
  });

  it("matches hospital label rows by English name, Korean name, and code", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");

    expect(abilify && matchesHospitalDrugLabel(abilify, "asimtufii")).toBe(true);
    expect(abilify && matchesHospitalDrugLabel(abilify, "아심투파이")).toBe(true);
    expect(abilify && matchesHospitalDrugLabel(abilify, "XXARPIP72")).toBe(true);
  });

  it("identifies controlled drug prefixes and strips them from common names", () => {
    const narcotic = { name: "[마약] Fentanyl citrate 50mcg/ml inj", koreanName: "[마약] 한림구연산펜타닐주 50mcg/ml" };
    const psychotropic = { name: "[향정]Ativan 4mg/1ml inj", koreanName: "[향정] 아티반주 4mg/1ml" };

    expect(getHospitalDrugControlledCategory(narcotic)).toBe("마약");
    expect(stripHospitalDrugControlledPrefix(narcotic.name)).toBe("Fentanyl citrate 50mcg/ml inj");
    expect(getHospitalDrugControlledCategory(psychotropic)).toBe("향정");
    expect(stripHospitalDrugControlledPrefix(psychotropic.name)).toBe("Ativan 4mg/1ml inj");
  });

  it("excludes PCA and test-use controlled drug names from the 40x70 list", () => {
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] PCA-Fentanyl 500mcg/10ml Inj" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] Fentanyl 50mcg소화기검사용" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] Morphine 5mg inj 검사용" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[향정] Midazolam 5mg/5ml inj 소화기병검사실" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] Fentanyl citrate 50mcg/ml inj" })).toBe(false);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[향정]Midazolam 5mg/5ml inj (검사용)" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[향정]Midazolam 5mg/5ml inj" })).toBe(false);
  });
});
