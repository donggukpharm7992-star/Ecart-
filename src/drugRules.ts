import type { StockDrug } from "./types";

const HIGH_RISK_LABEL = "고위험의약품";

const FORCE_REFRIGERATED_CODES = new Set([
  "BCG-H",
  "XADH",
  "XCFACT120",
  "XMVH",
  "XNICORA",
  "XOXYT",
  "XPGE110",
  "XXFILG3",
]);

type DrugRuleFields = Pick<StockDrug, "code" | "genericName" | "productName" | "spec" | "warning">;

function compactText(value: string) {
  return value.toLowerCase().replace(/[\s,._/-]+/g, "");
}

function drugText(drug: DrugRuleFields) {
  return compactText([drug.code, drug.genericName, drug.productName, drug.spec].filter(Boolean).join(" "));
}

function hasHeparinStrength(text: string) {
  return (
    /heparin.*(?:20000iu|20000u).*20ml/.test(text) ||
    /heparin.*(?:25000iu|25000u).*5ml/.test(text) ||
    /heparin.*(?:5000iu|5000u).*5ml/.test(text) ||
    /heparin.*(?:1000iu|1000u).*10ml/.test(text)
  );
}

export function isForcedRefrigeratedDrug(drug: Pick<StockDrug, "code" | "productName">) {
  return FORCE_REFRIGERATED_CODES.has(drug.code) || /grasin.*300mcg/i.test(drug.productName);
}

export function isHighRiskDrug(drug: DrugRuleFields) {
  const text = drugText(drug);
  return (
    /(?:kcl|potassiumchloride).*20meq.*20ml/.test(text) ||
    /nacl.*40meq.*20ml/.test(text) ||
    /sodiumacetate.*40meq.*20ml/.test(text) ||
    /(?:mgso4|magnesiumsulfate).*50%.*20ml/.test(text) ||
    text.includes("phosten") ||
    hasHeparinStrength(text) ||
    text.includes("esmeron") ||
    text.includes("lysthenon") ||
    text.includes("vecaron") ||
    /insulin.*vial/.test(text)
  );
}

export function normalizeDrugWarning(drug: DrugRuleFields) {
  const warnings = drug.warning
    .split(",")
    .map((warning) => warning.trim())
    .filter((warning) => warning && !warning.replace(/\s+/g, "").includes(HIGH_RISK_LABEL));

  if (isHighRiskDrug(drug)) {
    warnings.push(HIGH_RISK_LABEL);
  }

  return [...new Set(warnings)].join(", ");
}
