export type HospitalDrugLabelRow = {
  code: string;
  name: string;
  koreanName: string;
  strength: string;
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

export function makeHospitalDrugLabelId(row: Pick<HospitalDrugLabelRow, "code">) {
  return `pharmacy-${row.code}`;
}

export function makeHospitalControlledDrugLabelId(row: Pick<HospitalDrugLabelRow, "code">) {
  return `narcotic-hospital-${row.code}`;
}

export function getHospitalDrugControlledCategory(
  row: Pick<HospitalDrugLabelRow, "name" | "koreanName">,
): HospitalDrugControlledCategory | undefined {
  const match = row.name.match(CONTROLLED_DRUG_PREFIX_PATTERN) ?? row.koreanName.match(CONTROLLED_DRUG_PREFIX_PATTERN);
  return match?.[1] as HospitalDrugControlledCategory | undefined;
}

export function stripHospitalDrugControlledPrefix(name: string) {
  return name.replace(CONTROLLED_DRUG_PREFIX_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

export function shouldExcludeHospitalControlledDrugLabel(row: Pick<HospitalDrugLabelRow, "name">) {
  const name = stripHospitalDrugControlledPrefix(row.name);
  return /^PCA-/i.test(name) || /\uc18c\ud654\uae30\s*\uac80\uc0ac\uc6a9/u.test(name) || (/midazolam/i.test(name) && /\uac80\uc0ac\uc6a9/u.test(name));
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

export function isHospitalDrugRefrigerated(row: HospitalDrugLabelRow) {
  const storage = compact(row.storage);
  if (storage.includes("냉장보관하지")) return false;
  return storage.includes("냉장") || /2[-~∼～]8/.test(storage);
}

export function getHospitalDrugStorageLabel(row: HospitalDrugLabelRow) {
  if (isHospitalDrugRefrigerated(row)) return "냉장";
  if (isHospitalDrugLightProtected(row)) return "차광";
  return "실온";
}

export function getHospitalDrugLabelWarnings(row: HospitalDrugLabelRow) {
  const warnings: string[] = [];
  if (row.similarLook) warnings.push("유사모양");
  if (row.similarSound) warnings.push("유사발음");
  if (row.doseCaution) warnings.push("용량주의");
  return warnings;
}
