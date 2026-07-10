import { describe, expect, it } from "vitest";
import {
  getHospitalDrugControlledCategory,
  getHospitalDrugLabelWarnings,
  getHospitalDrugStorageLabel,
  isHospitalDrugLightProtected,
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

  it("uses workbook storage, light protection, and caution columns for labels", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");
    const albumin = rows.find((row) => row.code === "X20AL1S");

    expect(abilify && isHospitalDrugLightProtected(abilify)).toBe(true);
    expect(abilify && getHospitalDrugStorageLabel(abilify)).toBe("차광");
    expect(albumin && getHospitalDrugLabelWarnings(albumin)).toContain("용량주의");
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

  it("excludes PCA and endoscopy-use controlled drug labels from the 40x70 list", () => {
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] PCA-Fentanyl 500mcg/10ml Inj" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] Fentanyl 50mcg소화기검사용" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[마약] Fentanyl citrate 50mcg/ml inj" })).toBe(false);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[향정]Midazolam 5mg/5ml inj (검사용)" })).toBe(true);
    expect(shouldExcludeHospitalControlledDrugLabel({ name: "[향정]Midazolam 5mg/5ml inj" })).toBe(false);
  });
});
