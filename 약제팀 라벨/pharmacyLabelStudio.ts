import {
  getHospitalDrugLabelWarnings,
  isHospitalDrugLightProtected,
  isHospitalDrugRefrigerated,
  type HospitalDrugLabelRow,
} from "./hospitalDrugLabels";

export type PharmacyLabelFamily = "drug" | "cabinet";
export type PharmacyLabelCategory =
  | "원병" | "PTP" | "ATC" | "입원산제"
  | "외용제" | "외용점안제" | "팩제" | "시럽"
  | "앰플" | "바이알" | "냉장주사" | "영양수액" | "일반수액"
  | "마약/향정" | "항암제";
export type PharmacyLabelSizePresetKey = string;
export type PharmacyLabelPaper = { key: "A4" | "A3"; widthMm: number; heightMm: number; marginMm: number };
export type PharmacyLabelSize = { presetKey: PharmacyLabelSizePresetKey; widthMm: number; heightMm: number };
export type PharmacyLabelStyle = {
  outerBorderPx: number;
  outerBorderColor: string;
  textOutlinePx: number;
  textOutlineColor: string;
  fontFamily: string;
  fontSizePt: number;
  fontColor: string;
  warningColor: string;
};
export type PharmacyPrintableText = {
  title: string;
  koreanName: string;
  strength: string;
  warning: string;
  topBanner: string;
  footer: { enabled: boolean; text: string };
  reconstitution: string;
};
export type PharmacyLabelDraft = {
  id: string;
  code: string;
  itemCode: string;
  labelFamily: PharmacyLabelFamily;
  category: PharmacyLabelCategory;
  doseUnit?: "0.25T" | "0.5T" | "1T";
  accessory?: "측면라벨" | "병뚜껑" | "선반라벨";
  size: PharmacyLabelSize;
  printable: PharmacyPrintableText;
  warnings: string[];
  drugTypes: string[];
  style: PharmacyLabelStyle;
  sourceType: "workbook" | "manual" | "new";
  savedAt?: string;
};
export type PharmacySavedLabel = PharmacyLabelDraft & { savedAt: string };

export const A4_PAPER: PharmacyLabelPaper = { key: "A4", widthMm: 210, heightMm: 297, marginMm: 10 };
export const A3_PAPER: PharmacyLabelPaper = { key: "A3", widthMm: 297, heightMm: 420, marginMm: 10 };
export const DEFAULT_PHARMACY_LABEL_SIZE: PharmacyLabelSize = { presetKey: "33x100", widthMm: 100, heightMm: 33 };
export const PHARMACY_LABEL_REPOSITORY_KEY = "pharmacy-label-repository-v2";
export const WARNING_OPTIONS = ["용량주의", "유사발음", "유사모양", "고위험의약품", "이름주의", "용량확인", "냉장", "차광"] as const;
export const DRUG_CATEGORIES: PharmacyLabelCategory[][] = [
  ["원병", "PTP", "ATC", "입원산제"],
  ["외용제", "외용점안제", "팩제", "시럽"],
  ["앰플", "바이알", "냉장주사", "영양수액", "일반수액"],
  ["마약/향정"],
  ["항암제"],
];
export const CABINET_CATEGORIES: PharmacyLabelCategory[][] = DRUG_CATEGORIES.slice(0, 3);

const SIZE_MAP: Record<string, PharmacyLabelSize[]> = {
  외용제: sizes(["33*100", "13.5*105", "40*80", "44*100"]),
  외용점안제: sizes(["33*100", "13.5*105", "40*80", "44*100"]),
  팩제: sizes(["33*100", "13.5*105", "40*80", "44*100"]),
  앰플: sizes(["33*100"]),
  바이알: sizes(["40*80", "42*80", "47*80", "52*80", "47*90"]),
  PTP: sizes(["40*80", "42*80", "47*80", "52*80", "47*90"]),
  냉장주사: sizes(["40*80", "42*80", "47*80", "52*80"]),
  영양수액: sizes(["15*110", "15*140"]),
  일반수액: sizes(["50*93", "55*93", "50*160"]),
  "마약/향정": sizes(["40*70"]),
  항암제: sizes(["46*80"]),
  원병: sizes(["33*100", "220*1020", "27*10", "30*15"]),
};

function sizes(values: string[]) {
  return values.map((value) => {
    const [heightMm, widthMm] = value.split("*").map(Number);
    return { presetKey: value.replace("*", "x"), widthMm, heightMm };
  });
}

export function sizesForCategory(category: PharmacyLabelCategory, row?: HospitalDrugLabelRow) {
  const available = SIZE_MAP[category] ?? [DEFAULT_PHARMACY_LABEL_SIZE];
  if (category === "영양수액") return [row && getHospitalDrugLabelWarnings(row).length > 0 ? available[1] : available[0]];
  if (row?.border && ["PTP", "바이알", "냉장주사"].includes(category)) return available.filter((size) => size.heightMm > 40);
  return available;
}

export function rowMatchesCategory(row: HospitalDrugLabelRow, category: PharmacyLabelCategory) {
  const type = row.drugType.replace(/\s+/g, "");
  if (!row.inHospital) return false;
  if (category === "항암제") return type === "항암제" || (row.highRiskCategory ?? "").includes("주사용항암제");
  if (category === "마약/향정") return type === "마약" || type === "향정";
  if (category === "냉장주사") return isHospitalDrugRefrigerated(row) && ["앰플", "바이알", "주사"].some((value) => type.includes(value));
  if (category === "입원산제") return Boolean(row.inpatientPowderPtp);
  if (category === "ATC") return Boolean(row.atc);
  if (category === "PTP") return type === "PTP" || Boolean(row.ptpOpened);
  if (category === "외용제") return type === "외용제";
  if (category === "외용점안제") return type === "외용점안제";
  if (category === "팩제") return type === "팩제";
  return type === category;
}

export function createPharmacyLabelDraft(
  row: HospitalDrugLabelRow,
  category: PharmacyLabelCategory,
  labelFamily: PharmacyLabelFamily,
): PharmacyLabelDraft {
  const warnings = getHospitalDrugLabelWarnings(row);
  const size = sizesForCategory(category, row)[0] ?? DEFAULT_PHARMACY_LABEL_SIZE;
  const anticancer = category === "항암제";
  return {
    id: `pharmacy-label-${row.code}-${labelFamily}-${category}`,
    code: row.code,
    itemCode: row.itemCode ?? "",
    labelFamily,
    category,
    size,
    printable: {
      title: row.name,
      koreanName: row.koreanName,
      strength: row.strength,
      warning: warnings.join(" · "),
      topBanner: anticancer ? "고위험의약품" : row.oralAnticancer ? "경구항암제" : row.highCost ? "고가약" : "",
      footer: {
        enabled: anticancer || row.highRisk,
        text: anticancer
          ? ["항암제", isHospitalDrugRefrigerated(row) ? "냉장" : "", isHospitalDrugLightProtected(row) ? "차광" : ""].filter(Boolean).join(" · ")
          : row.highRiskCategory ?? "",
      },
      reconstitution: "",
    },
    warnings,
    drugTypes: row.drugType ? [row.drugType] : [],
    style: {
      outerBorderPx: row.border ? 5 : 2,
      outerBorderColor: row.borderColor || "#111827",
      textOutlinePx: 0,
      textOutlineColor: "#ffffff",
      fontFamily: "Malgun Gothic, Segoe UI, sans-serif",
      fontSizePt: anticancer ? 21 : 18,
      fontColor: "#111827",
      warningColor: "#d92d20",
    },
    sourceType: "workbook",
  };
}

export function resolvePharmacyLabelDraft(
  row: HospitalDrugLabelRow,
  savedLabels: PharmacySavedLabel[],
  category: PharmacyLabelCategory,
  family: PharmacyLabelFamily,
) {
  return savedLabels
    .filter((label) => label.code === row.code && label.category === category && label.labelFamily === family)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] ?? createPharmacyLabelDraft(row, category, family);
}

export function savePharmacyLabelDraft(draft: PharmacyLabelDraft, now = new Date()): PharmacySavedLabel {
  return { ...draft, sourceType: "manual", savedAt: now.toISOString() };
}

export function groupPharmacyLabelsForPaper(labels: PharmacyLabelDraft[], paper: PharmacyLabelPaper) {
  const pages: PharmacyLabelDraft[][] = [];
  let page: PharmacyLabelDraft[] = [];
  let x = 0, y = 0, rowHeight = 0;
  const maxWidth = paper.widthMm - paper.marginMm * 2;
  const maxHeight = paper.heightMm - paper.marginMm * 2;
  for (const label of labels) {
    if (x + label.size.widthMm > maxWidth) { x = 0; y += rowHeight; rowHeight = 0; }
    if (y + label.size.heightMm > maxHeight && page.length) { pages.push(page); page = []; x = 0; y = 0; rowHeight = 0; }
    page.push(label); x += label.size.widthMm; rowHeight = Math.max(rowHeight, label.size.heightMm);
  }
  if (page.length) pages.push(page);
  return pages;
}

export function loadSavedPharmacyLabelsFromStorage(storage: Pick<Storage, "getItem">): PharmacySavedLabel[] {
  try { return JSON.parse(storage.getItem(PHARMACY_LABEL_REPOSITORY_KEY) ?? "[]"); } catch { return []; }
}
export function savePharmacyLabelToStorage(storage: Pick<Storage, "getItem" | "setItem">, draft: PharmacyLabelDraft, now = new Date()) {
  const saved = savePharmacyLabelDraft(draft, now);
  const previous = loadSavedPharmacyLabelsFromStorage(storage);
  storage.setItem(PHARMACY_LABEL_REPOSITORY_KEY, JSON.stringify([...previous.filter((label) => label.id !== saved.id), saved]));
  return saved;
}
export function writeSavedPharmacyLabelsToStorage(storage: Pick<Storage, "setItem">, labels: PharmacySavedLabel[]) {
  storage.setItem(PHARMACY_LABEL_REPOSITORY_KEY, JSON.stringify(labels));
}
