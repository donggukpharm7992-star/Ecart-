import { describe, expect, it } from "vitest";
import type { StockDrug } from "./types";
import { isForcedRefrigeratedDrug, isHighRiskDrug, normalizeDrugWarning } from "./drugRules";

const baseDrug: StockDrug = {
  code: "TEST",
  genericName: "",
  productName: "",
  spec: "",
  storage: "실온보관",
  note: "",
  warning: "",
  storageType: "ROOM",
};

function drug(patch: Partial<StockDrug>): StockDrug {
  return { ...baseDrug, ...patch };
}

describe("drug rules", () => {
  it("marks only the requested high-risk drug names and concentrations", () => {
    expect(isHighRiskDrug(drug({ productName: "NaCl 40mEq/20ml" }))).toBe(true);
    expect(isHighRiskDrug(drug({ productName: "Phosten 20ml inj" }))).toBe(true);
    expect(isHighRiskDrug(drug({ genericName: "Heparin sodium 20000IU/20ml" }))).toBe(true);
    expect(isHighRiskDrug(drug({ productName: "Vecaron 10mg inj" }))).toBe(true);
    expect(isHighRiskDrug(drug({ productName: "Insulin vial" }))).toBe(true);

    expect(isHighRiskDrug(drug({ genericName: "Heparin sodium 100IU/ml", warning: "고위험의약품" }))).toBe(false);
    expect(isHighRiskDrug(drug({ productName: "Etomidate lipuro 20mg/10ml inj", warning: "고위험의약품" }))).toBe(false);
    expect(isHighRiskDrug(drug({ genericName: "MgSO4 10% 20ml" }))).toBe(false);
  });

  it("adds or removes the high-risk warning based on the approved list", () => {
    expect(normalizeDrugWarning(drug({ productName: "Esmeron 50mg/5ml inj" }))).toBe("고위험의약품");
    expect(normalizeDrugWarning(drug({ productName: "Etomidate lipuro 20mg/10ml inj", warning: "고위험의약품" }))).toBe("");
    expect(normalizeDrugWarning(drug({ productName: "Macperan 10mg inj", warning: "유사모양, 고위험의약품" }))).toBe("유사모양");
  });

  it("forces Grasin 300mcg into refrigerated stock grouping", () => {
    expect(isForcedRefrigeratedDrug(drug({ code: "XXFILG3", productName: "GRASIN 300mcg/0.7ml pfs" }))).toBe(true);
  });
});
