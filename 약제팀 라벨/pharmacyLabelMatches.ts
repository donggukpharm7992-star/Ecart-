import rawRows from "./data/pharmacyLabelMatches.generated.json";

export type PharmacyLabelMatchStatus = "확정" | "검토필요" | "미매칭" | string;

export type PharmacyLabelMatchSearchRow = {
  code: string;
  englishName: string;
  koreanName: string;
  strength: string;
  spec: string;
  package: string;
  storage: string;
  matchedLabel: string;
};

export type PharmacyLabelMatchRow = PharmacyLabelMatchSearchRow & {
  lightProtected: boolean;
  refrigerated: boolean;
  doseCaution: boolean;
  similarSound: boolean;
  similarLook: boolean;
  highRisk: boolean;
  highCaution: boolean;
  anticancer: boolean;
  narcotic: boolean;
  psychotropic: boolean;
  highCost: boolean;
  nameCaution: boolean;
  sourceFile: string;
  sourceLocation: string;
  matchStatus: PharmacyLabelMatchStatus;
  matchScore: number;
  matchReason: string;
  conditionSource: string;
  reviewMemo: string;
};

export function splitMatchedLabelCandidates(value: string) {
  return value
    .split(/\n?---\n?/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function loadPharmacyLabelMatchRows() {
  return Promise.resolve(rawRows as PharmacyLabelMatchRow[]);
}

export function matchesPharmacyLabelMatch(row: PharmacyLabelMatchSearchRow, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  const compactValue = value.replace(/\s+/g, "");
  const text = [
    row.code,
    row.englishName,
    row.koreanName,
    row.strength,
    row.spec,
    row.package,
    row.storage,
    row.matchedLabel,
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(value) || text.replace(/\s+/g, "").includes(compactValue);
}
