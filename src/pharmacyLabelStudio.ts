import { splitMatchedLabelCandidates, type PharmacyLabelMatchRow } from "./pharmacyLabelMatches";

export type PharmacyLabelType = "drug-name";
export type PharmacyLabelSourceType = "matched-workbook" | "manual" | "new";
export type PharmacyLabelSizePresetKey = "10x70" | "15x95" | "35x100" | "55x95" | "custom";

export type PharmacyLabelPaper = {
  key: "A4" | "A3";
  widthMm: number;
  heightMm: number;
  marginMm: number;
};

export type PharmacyLabelSize = {
  presetKey: PharmacyLabelSizePresetKey;
  widthMm: number;
  heightMm: number;
};

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
  warning: string;
  footer: {
    enabled: boolean;
    text: string;
  };
};

export type PharmacyLabelDraft = {
  id: string;
  code: string;
  labelType: PharmacyLabelType;
  size: PharmacyLabelSize;
  printable: PharmacyPrintableText;
  style: PharmacyLabelStyle;
  sourceType: PharmacyLabelSourceType;
  sourceFile?: string;
  sourceLocation?: string;
  savedAt?: string;
};

export type PharmacySavedLabel = PharmacyLabelDraft & {
  savedAt: string;
};

export const DEFAULT_PHARMACY_LABEL_SIZE: PharmacyLabelSize = {
  presetKey: "35x100",
  widthMm: 100,
  heightMm: 35,
};

export const PHARMACY_LABEL_SIZE_PRESETS: PharmacyLabelSize[] = [
  { presetKey: "35x100", widthMm: 100, heightMm: 35 },
  { presetKey: "10x70", widthMm: 70, heightMm: 10 },
  { presetKey: "15x95", widthMm: 95, heightMm: 15 },
  { presetKey: "55x95", widthMm: 95, heightMm: 55 },
];

export const A4_PAPER: PharmacyLabelPaper = { key: "A4", widthMm: 210, heightMm: 297, marginMm: 10 };
export const A3_PAPER: PharmacyLabelPaper = { key: "A3", widthMm: 297, heightMm: 420, marginMm: 10 };

export const DEFAULT_PHARMACY_LABEL_STYLE: PharmacyLabelStyle = {
  outerBorderPx: 3,
  outerBorderColor: "#111827",
  textOutlinePx: 0,
  textOutlineColor: "#ffffff",
  fontFamily: "Malgun Gothic, Segoe UI, sans-serif",
  fontSizePt: 25,
  fontColor: "#111827",
  warningColor: "#d92d20",
};

export const PHARMACY_LABEL_REPOSITORY_KEY = "pharmacy-label-repository-v1";

function warningText(row: PharmacyLabelMatchRow) {
  if (row.lightProtected) return "차광\n필요";
  if (row.refrigerated) return "냉장";
  return "";
}

export function createMatchedPharmacyLabelDraft(row: PharmacyLabelMatchRow): PharmacyLabelDraft {
  const candidate = splitMatchedLabelCandidates(row.matchedLabel)[0];
  return {
    id: `pharmacy-label-${row.code}`,
    code: row.code,
    labelType: "drug-name",
    size: DEFAULT_PHARMACY_LABEL_SIZE,
    printable: {
      title: candidate || row.englishName || row.koreanName,
      warning: warningText(row),
      footer: { enabled: false, text: "" },
    },
    style: DEFAULT_PHARMACY_LABEL_STYLE,
    sourceType: "matched-workbook",
    sourceFile: row.sourceFile,
    sourceLocation: row.sourceLocation,
  };
}

export function createEmptyPharmacyLabelDraft(code: string, name: string): PharmacyLabelDraft {
  return {
    id: `pharmacy-label-${code}`,
    code,
    labelType: "drug-name",
    size: DEFAULT_PHARMACY_LABEL_SIZE,
    printable: {
      title: name,
      warning: "",
      footer: { enabled: false, text: "" },
    },
    style: DEFAULT_PHARMACY_LABEL_STYLE,
    sourceType: "new",
  };
}

export function resolvePharmacyLabelDraft(row: PharmacyLabelMatchRow, savedLabels: PharmacySavedLabel[]) {
  const saved = [...savedLabels]
    .filter((label) => label.code === row.code)
    .sort((first, second) => second.savedAt.localeCompare(first.savedAt))[0];
  return saved ?? createMatchedPharmacyLabelDraft(row);
}

export function savePharmacyLabelDraft(draft: PharmacyLabelDraft, now = new Date()): PharmacySavedLabel {
  return {
    ...draft,
    sourceType: "manual",
    savedAt: now.toISOString(),
  };
}

export function groupPharmacyLabelsForPaper(labels: PharmacyLabelDraft[], paper: PharmacyLabelPaper) {
  const pages: PharmacyLabelDraft[][] = [];
  let currentPage: PharmacyLabelDraft[] = [];
  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;
  const maxWidth = paper.widthMm - paper.marginMm * 2;
  const maxHeight = paper.heightMm - paper.marginMm * 2;

  labels.forEach((label) => {
    if (currentX + label.size.widthMm > maxWidth) {
      currentX = 0;
      currentY += rowHeight;
      rowHeight = 0;
    }
    if (currentY + label.size.heightMm > maxHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentX = 0;
      currentY = 0;
      rowHeight = 0;
    }

    currentPage.push(label);
    currentX += label.size.widthMm;
    rowHeight = Math.max(rowHeight, label.size.heightMm);
  });

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

export function loadSavedPharmacyLabelsFromStorage(storage: Pick<Storage, "getItem">): PharmacySavedLabel[] {
  const raw = storage.getItem(PHARMACY_LABEL_REPOSITORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PharmacySavedLabel[];
    return Array.isArray(parsed) ? parsed.filter((label) => label.code && label.savedAt) : [];
  } catch {
    return [];
  }
}

export function writeSavedPharmacyLabelsToStorage(storage: Pick<Storage, "setItem">, labels: PharmacySavedLabel[]) {
  storage.setItem(PHARMACY_LABEL_REPOSITORY_KEY, JSON.stringify(labels));
}

export function savePharmacyLabelToStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
  draft: PharmacyLabelDraft,
  now = new Date(),
) {
  const saved = savePharmacyLabelDraft(draft, now);
  const previous = loadSavedPharmacyLabelsFromStorage(storage);
  writeSavedPharmacyLabelsToStorage(storage, [...previous.filter((label) => label.id !== saved.id), saved]);
  return saved;
}
