import rawRows from "./data/narcoticLabels.generated.json";
import type { NarcoticCategory } from "./narcoticData";

export type NarcoticLabelRow = {
  code: string;
  labelText: string;
  category: NarcoticCategory;
  categoryText: string;
  cautionText: string;
  sourceFile: string;
  sourceSheet: string;
  sourceCell: string;
};

export const NARCOTIC_LABEL_ROWS = rawRows as NarcoticLabelRow[];

function compact(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

export function makeNarcoticLabelId(row: Pick<NarcoticLabelRow, "code" | "sourceFile" | "sourceCell">) {
  return `narcotic-label-${row.code}-${row.sourceFile}-${row.sourceCell}`;
}

export function matchesNarcoticLabel(row: NarcoticLabelRow, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  const compactValue = compact(value);
  const text = [row.code, row.labelText, row.category, row.categoryText, row.cautionText, row.sourceFile].join(" ").toLowerCase();
  return text.includes(value) || compact(text).includes(compactValue);
}
