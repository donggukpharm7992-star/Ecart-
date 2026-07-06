import type { StockDrug } from "./types";

const HIGH_RISK_LABEL = "고위험의약품";
const SIMILAR_SOUND_LABEL = "유사발음";
const DOSE_CAUTION_LABEL = "용량주의";
const SIMILAR_LOOK_LABEL = "유사모양";

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

export type DrugRuleFields = Pick<StockDrug, "code" | "genericName" | "productName" | "spec" | "warning">;

const SIMILAR_SOUND_POLICY_NAMES = [
  "BETAmethasone",
  "Dexamethasone",
  "Bactacin",
  "Betasin",
  "DOBUTamine",
  "DOPAmine",
  "EPHEDrine",
  "EPInephrine",
  "Flumarin",
  "Furtman",
  "Neocaf",
  "Peridol",
  "Pyrinol",
  "PlacenTEX",
  "pREceDex",
  "remiCADE",
  "remSIMA",
  "Diabex",
  "Micardis",
  "Mucopect",
  "MucoSTA",
  "Tegretol",
  "Zyprexa",
];

const DOSE_CAUTION_POLICY_NAMES = [
  "Albumin",
  "Aloxi",
  "Cancidas",
  "Cerebyx",
  "Citopcin",
  "Clexane",
  "Ferbon",
  "Leuplin",
  "Lequembi",
  "Naloxone",
  "Omapone",
  "SMOFlipid",
  "smof LIPID",
  "Dilatrend",
  "Perkin",
  "Stalevo",
  "Warfarin",
];

const SIMILAR_LOOK_POLICY_NAMES = [
  "Macperan",
  "Lasix",
  "Nitrolingual",
  "Perdipine",
  "Airtal",
  "Tiropa",
  "Alpram",
  "Cozaar",
  "Pyrazinamide",
  "Ursa",
  "Benztropine",
  "Digoxin",
  "Dichlozid",
  "Hytrin",
  "Diazepam",
  "Flospan",
  "Warfarin",
  "Duloctine",
  "Kabalin",
  "Ebastel",
  "Stilnox",
  "Eliquis",
  "MotiliTONE",
  "Kerendia",
  "Eloton",
  "Gaster-D",
  "Harnal-D",
  "Gabapenin",
  "Prebalin",
  "Indenol",
  "Myonal",
  "Imipramine",
  "Pennel",
  "Vancozin",
  "Pidogul",
  "Plavix",
  "ZALEDEEP",
  "Atrovent",
  "Mucomyst",
  "PULmican",
  "Ventolin",
];

function compactText(value: string) {
  return value.toLowerCase().replace(/[\s,._/-]+/g, "");
}

function drugText(drug: DrugRuleFields) {
  return compactText([drug.code, drug.genericName, drug.productName, drug.spec].filter(Boolean).join(" "));
}

function hasPolicyName(drug: DrugRuleFields, names: string[]) {
  const text = drugText(drug);
  return names.some((name) => text.includes(compactText(name)));
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

export function getPolicyCautionLabels(drug: DrugRuleFields) {
  const labels: string[] = [];
  if (hasPolicyName(drug, SIMILAR_SOUND_POLICY_NAMES)) labels.push(SIMILAR_SOUND_LABEL);
  if (hasPolicyName(drug, DOSE_CAUTION_POLICY_NAMES)) labels.push(DOSE_CAUTION_LABEL);
  if (hasPolicyName(drug, SIMILAR_LOOK_POLICY_NAMES)) labels.push(SIMILAR_LOOK_LABEL);
  return [...new Set(labels)];
}
