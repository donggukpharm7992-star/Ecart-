import { isHighRiskDrug } from "../src/drugRules";

export type HospitalDrugLabelRow = {
  code: string;
  name: string;
  koreanName: string;
  strength: string;
  drugType: string;
  spec: string;
  package: string;
  storage: string;
  lightProtected: boolean;
  inHospital: boolean;
  similarLook: boolean;
  similarSound: boolean;
  doseCaution: boolean;
};

type HospitalDrugLabelsModule = {
  default: HospitalDrugLabelRow[];
};

export type HospitalDrugControlledCategory = "마약" | "향정";

let hospitalDrugLabelsPromise: Promise<HospitalDrugLabelRow[]> | null = null;

function compact(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

const CONTROLLED_DRUG_PREFIX_PATTERN = /^\s*\[(마약|향정)\]\s*/;
const NUMERIC_COMMON_NAME_PATTERN = /^\d+(?:\.\d+)?$/;

export function makeHospitalDrugLabelId(row: Pick<HospitalDrugLabelRow, "code">) {
  return `pharmacy-${row.code}`;
}

export function makeHospitalControlledDrugLabelId(row: Pick<HospitalDrugLabelRow, "code">) {
  return `narcotic-hospital-${row.code}`;
}

export function getHospitalDrugControlledCategory(
  row: Pick<HospitalDrugLabelRow, "name" | "koreanName"> & Partial<Pick<HospitalDrugLabelRow, "drugType">>,
): HospitalDrugControlledCategory | undefined {
  if (isHospitalDrugType(row, "마약")) return "마약";
  if (isHospitalDrugType(row, "향정")) return "향정";
  const match = row.name.match(CONTROLLED_DRUG_PREFIX_PATTERN) ?? row.koreanName.match(CONTROLLED_DRUG_PREFIX_PATTERN);
  return match?.[1] as HospitalDrugControlledCategory | undefined;
}

export function isHospitalDrugType(row: Partial<Pick<HospitalDrugLabelRow, "drugType">>, drugType: string) {
  return compact(row.drugType ?? "") === compact(drugType);
}

export function isHospitalControlledDrugType(row: Partial<Pick<HospitalDrugLabelRow, "drugType">>) {
  return isHospitalDrugType(row, "마약") || isHospitalDrugType(row, "향정");
}

export function isHospitalGeneralDrugLabelType(row: Partial<Pick<HospitalDrugLabelRow, "drugType">>) {
  return (row.drugType ?? "").trim().length > 0 && !isHospitalDrugType(row, "일반수액") && !isHospitalControlledDrugType(row);
}

export function isSelectableHospitalDrugLabelRow(
  row: Pick<HospitalDrugLabelRow, "name" | "inHospital"> & Partial<Pick<HospitalDrugLabelRow, "drugType">>,
) {
  const name = row.name.trim();
  return row.inHospital && name.length > 0 && (row.drugType ?? "").trim().length > 0 && !NUMERIC_COMMON_NAME_PATTERN.test(name);
}

export function stripHospitalDrugControlledPrefix(name: string) {
  return name.replace(CONTROLLED_DRUG_PREFIX_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

export function shouldExcludeHospitalControlledDrugLabel(row: Pick<HospitalDrugLabelRow, "name">) {
  const name = stripHospitalDrugControlledPrefix(row.name);
  return /^PCA-/i.test(name) || /\uac80\uc0ac\uc6a9/u.test(name) || /\uc18c\ud654\uae30\s*\ubcd1?\s*\uac80\uc0ac\uc2e4/u.test(name);
}

export function loadHospitalDrugLabelRows() {
  hospitalDrugLabelsPromise ??= (import("./data/hospitalDrugLabels.generated.json") as Promise<HospitalDrugLabelsModule>).then(
    (module) => module.default,
  );
  return hospitalDrugLabelsPromise;
}

export function matchesHospitalDrugLabel(row: HospitalDrugLabelRow, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  const compactValue = compact(value);
  const text = [row.code, row.name, row.koreanName, row.strength, row.spec, row.package, row.storage].join(" ").toLowerCase();
  const compactText = compact(text);
  return text.includes(value) || compactText.includes(compactValue);
}

export function isHospitalDrugLightProtected(row: HospitalDrugLabelRow) {
  return row.lightProtected || compact(row.storage).includes("차광");
}

export function isHospitalDrugFrozen(row: HospitalDrugLabelRow) {
  const storage = compact(row.storage);
  return storage.includes("냉동");
}

export function isHospitalDrugRefrigerated(row: HospitalDrugLabelRow) {
  const storage = compact(row.storage);
  if (storage.includes("냉장보관하지")) return false;
  return storage.includes("냉장") || /2[-~∼～]8/.test(storage);
}

export function isHospitalDrugHighRisk(row: HospitalDrugLabelRow) {
  return isHighRiskDrug({
    code: row.code,
    genericName: row.koreanName,
    productName: row.name,
    spec: [row.strength, row.spec, row.package].filter(Boolean).join(" "),
    warning: "",
  });
}

export function getHospitalDrugStorageLabel(row: HospitalDrugLabelRow) {
  if (isHospitalDrugFrozen(row)) return "냉동";
  if (isHospitalDrugRefrigerated(row)) return "냉장";
  return "";
}

export function getHospitalDrugLabelWarnings(row: HospitalDrugLabelRow) {
  const warnings: string[] = [];
  if (isHospitalDrugLightProtected(row)) warnings.push("차광");
  if (row.similarLook) warnings.push("유사모양");
  if (row.similarSound) warnings.push("유사발음");
  if (row.doseCaution) warnings.push("용량주의");
  if (isHospitalDrugHighRisk(row)) warnings.push("고위험의약품");
  return warnings;
}
