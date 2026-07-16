import * as XLSX from "xlsx";
import type { PharmacyLabelDraft } from "./pharmacyLabelStudio";

const WARNING_HEADERS: Record<string, string> = {
  용량주의: "용량주의",
  유사발음: "유사발음",
  유사모양: "유사모양",
  고위험의약품: "고위험의약품",
  이름주의: "이름주의",
  용량확인: "용량확인",
};

function compact(value: unknown) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

export async function savePharmacyLabelDraftToWorkbook(draft: PharmacyLabelDraft, workbookUrl: string) {
  const response = await fetch(workbookUrl);
  if (!response.ok) throw new Error("원내보유의약품리스트 원본을 불러오지 못했습니다.");
  const workbook = XLSX.read(await response.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
  const headers = (rows[0] ?? []).map((value) => String(value ?? "").replace(/\n/g, " ").trim());
  const index = new Map(headers.map((header, position) => [header, position]));
  const codeIndex = index.get("약품코드");
  if (codeIndex == null) throw new Error("원내보유의약품리스트에서 약품코드 열을 찾지 못했습니다.");
  const rowIndex = rows.findIndex((row, position) => position > 0 && compact(row[codeIndex]) === compact(draft.code));
  if (rowIndex < 0) throw new Error(`${draft.code} 약품을 원내보유의약품리스트에서 찾지 못했습니다.`);

  const updates: Record<string, unknown> = {
    상용약품명: draft.printable.title,
    한글약품명: draft.printable.koreanName,
    함량: draft.printable.strength,
    위치: draft.location,
    ATC: draft.atc,
    약품유형: draft.drugTypes[0] ?? "",
    테두리: draft.style.outerBorderPx >= 5 ? "Y" : "N",
    "테두리 색기호": draft.style.outerBorderColor,
  };
  for (const [warning, header] of Object.entries(WARNING_HEADERS)) {
    updates[header] = draft.warnings.includes(warning) ? "Y" : "N";
  }
  for (const [header, value] of Object.entries(updates)) {
    const columnIndex = index.get(header);
    if (columnIndex == null) continue;
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    sheet[address] = { t: "s", v: String(value ?? "") };
  }
  XLSX.writeFile(workbook, "원내보유의약품리스트.xlsx", { compression: true });
}
