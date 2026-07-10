import { drugDisplayName } from "./inventoryState";
import type { StockAllocation, StockDrug, StockRoom } from "./types";

export type NarcoticStateSnapshot = Partial<{
  narcoticRooms: readonly StockRoom[];
  narcoticDrugs: readonly StockDrug[];
  narcoticAllocations: readonly StockAllocation[];
  narcoticDrugCategories: Record<string, unknown>;
  narcoticCheckedItems: Record<string, boolean>;
  narcoticExpiry: Record<string, string>;
  narcoticChecklistByRoom: Record<string, unknown>;
  narcoticRoundSummaryDraft: unknown;
  uninspectedNarcoticRoomIds: readonly string[];
  narcoticLotAssignments: Record<string, unknown>;
  narcoticLotFileName: string;
}>;

type SummaryOptions = {
  maxLines?: number;
};

const DEFAULT_MAX_LINES = 60;

function allocationKey(allocation: StockAllocation) {
  return `${allocation.roomId}::${allocation.drugCode}`;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? `${value}` : `${value}`;
}

function formatRoomLabel(room: StockRoom) {
  return room.label && room.label !== room.id ? `${room.id} (${room.label})` : room.id;
}

function sortText(a: string, b: string) {
  return a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => sortText(a, b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function countRecordChanges(before?: Record<string, unknown>, after?: Record<string, unknown>) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  let count = 0;
  keys.forEach((key) => {
    if (stableStringify(before?.[key]) !== stableStringify(after?.[key])) count += 1;
  });
  return count;
}

function countValueChange(before: unknown, after: unknown) {
  return stableStringify(before) === stableStringify(after) ? 0 : 1;
}

function appendLimited(lines: string[], line: string, maxLines: number, omitted: { count: number }) {
  if (lines.length < maxLines) {
    lines.push(line);
    return;
  }
  omitted.count += 1;
}

export function buildNarcoticStateChangeSummary(
  current: NarcoticStateSnapshot,
  incoming: NarcoticStateSnapshot,
  options: SummaryOptions = {},
) {
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const lines: string[] = [];
  const omitted = { count: 0 };
  const currentDrugs = current.narcoticDrugs ?? [];
  const incomingDrugs = incoming.narcoticDrugs ?? [];
  const drugByCode = new Map<string, StockDrug>();
  [...currentDrugs, ...incomingDrugs].forEach((drug) => drugByCode.set(drug.code, drug));

  const currentAllocations = new Map((current.narcoticAllocations ?? []).map((allocation) => [allocationKey(allocation), allocation]));
  const incomingAllocations = new Map((incoming.narcoticAllocations ?? []).map((allocation) => [allocationKey(allocation), allocation]));
  const allocationKeys = [...new Set([...currentAllocations.keys(), ...incomingAllocations.keys()])].sort(sortText);

  allocationKeys.forEach((key) => {
    const before = currentAllocations.get(key);
    const after = incomingAllocations.get(key);
    const allocation = after ?? before;
    if (!allocation) return;
    const drugName = drugDisplayName(drugByCode.get(allocation.drugCode) ?? ({ code: allocation.drugCode, genericName: "", productName: "" } as StockDrug));

    if (!before && after) {
      appendLimited(lines, `추가: ${after.roomId} ${drugName} ${formatQuantity(after.requiredQty)}개`, maxLines, omitted);
      return;
    }
    if (before && !after) {
      appendLimited(lines, `삭제: ${before.roomId} ${drugName} ${formatQuantity(before.requiredQty)}개 -> 0개`, maxLines, omitted);
      return;
    }
    if (before && after && before.requiredQty !== after.requiredQty) {
      appendLimited(
        lines,
        `수량 변경: ${after.roomId} ${drugName} ${formatQuantity(before.requiredQty)}개 -> ${formatQuantity(after.requiredQty)}개`,
        maxLines,
        omitted,
      );
    }
  });

  const currentRooms = new Map((current.narcoticRooms ?? []).map((room) => [room.id, room]));
  const incomingRooms = new Map((incoming.narcoticRooms ?? []).map((room) => [room.id, room]));
  [...new Set([...currentRooms.keys(), ...incomingRooms.keys()])]
    .sort(sortText)
    .forEach((roomId) => {
      const before = currentRooms.get(roomId);
      const after = incomingRooms.get(roomId);
      if (!before && after) appendLimited(lines, `보유실 추가: ${formatRoomLabel(after)}`, maxLines, omitted);
      if (before && !after) appendLimited(lines, `보유실 삭제: ${formatRoomLabel(before)}`, maxLines, omitted);
    });

  const currentDrugMap = new Map(currentDrugs.map((drug) => [drug.code, drug]));
  const incomingDrugMap = new Map(incomingDrugs.map((drug) => [drug.code, drug]));
  [...new Set([...currentDrugMap.keys(), ...incomingDrugMap.keys()])]
    .sort(sortText)
    .forEach((code) => {
      const before = currentDrugMap.get(code);
      const after = incomingDrugMap.get(code);
      if (!before && after) appendLimited(lines, `약품 추가: ${code} ${drugDisplayName(after)}`, maxLines, omitted);
      if (before && !after) appendLimited(lines, `약품 삭제: ${code} ${drugDisplayName(before)}`, maxLines, omitted);
    });

  const checkedChanges = countRecordChanges(current.narcoticCheckedItems, incoming.narcoticCheckedItems);
  if (checkedChanges > 0) appendLimited(lines, `점검 체크 변경: ${checkedChanges}건`, maxLines, omitted);

  const expiryChanges = countRecordChanges(current.narcoticExpiry, incoming.narcoticExpiry);
  if (expiryChanges > 0) appendLimited(lines, `3개월 미만 날짜 변경: ${expiryChanges}건`, maxLines, omitted);

  const checklistChanges = countRecordChanges(current.narcoticChecklistByRoom, incoming.narcoticChecklistByRoom);
  if (checklistChanges > 0) appendLimited(lines, `체크리스트/메모 변경: ${checklistChanges}개 보유실`, maxLines, omitted);

  const categoryChanges = countRecordChanges(current.narcoticDrugCategories, incoming.narcoticDrugCategories);
  if (categoryChanges > 0) appendLimited(lines, `마약류 구분 변경: ${categoryChanges}건`, maxLines, omitted);

  const lotChanges = countRecordChanges(current.narcoticLotAssignments, incoming.narcoticLotAssignments);
  if (lotChanges > 0) appendLimited(lines, `LOT 변경: ${lotChanges}건`, maxLines, omitted);

  if (current.narcoticLotFileName !== incoming.narcoticLotFileName) {
    appendLimited(lines, `LOT 파일명 변경: ${current.narcoticLotFileName || "없음"} -> ${incoming.narcoticLotFileName || "없음"}`, maxLines, omitted);
  }

  const uninspectedChanges = countValueChange(current.uninspectedNarcoticRoomIds ?? [], incoming.uninspectedNarcoticRoomIds ?? []);
  if (uninspectedChanges > 0) appendLimited(lines, "미점검 보유실 표시 변경", maxLines, omitted);

  const roundSummaryChanges = countValueChange(current.narcoticRoundSummaryDraft ?? null, incoming.narcoticRoundSummaryDraft ?? null);
  if (roundSummaryChanges > 0) appendLimited(lines, "순회점검표 내용 변경", maxLines, omitted);

  if (omitted.count > 0) lines.push(`외 ${omitted.count}건`);
  return lines;
}
