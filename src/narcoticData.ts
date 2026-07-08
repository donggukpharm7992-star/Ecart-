/**
 * narcoticData.ts
 * 비치 향정/마약 현황 데이터 모듈
 *
 * 데이터 소스: 마약/비치향정,마약현황.xlsx (점검 시트)
 */

import narcoticInventory from "./data/narcoticInventory.generated.json";
import type { ChecklistItem, StockAllocation, StockDrug, StockRoom } from "./types";

// ---------------------------------------------------------------------------
// 마약류 카테고리 타입
// ---------------------------------------------------------------------------
export type NarcoticCategory = "향정" | "마약";
type NarcoticGeneratedRoom = StockRoom & { floor?: string };
type NarcoticInventoryData = {
  drugs: Array<StockDrug & { narcoticCategory: NarcoticCategory }>;
  rooms: NarcoticGeneratedRoom[];
  allocations: StockAllocation[];
  drugCategories: Record<string, NarcoticCategory>;
};
const narcoticInventoryData = narcoticInventory as NarcoticInventoryData;

export const NARCOTIC_COMMON_NAME_CODE_ALIASES: Readonly<Record<string, string>> = {
  XPOCR5S: "CHR5-S",
  XATIV4W: "XLZPAM4",
  XATIV2W: "XLZPAM2",
  XKETA5W: "XKETA5",
  XDIAZ10W: "XDDP",
  XMIDZ15W: "XMIDA15",
  XMIDZ5W: "XMIDA5",
  XNALB10: "XNALBUP10W",
  XPROP1: "XPROPO115W",
  XPROP1T: "XPROPO120",
  XPROP2T: "XPROPO250",
  XPENT5: "XPTS500W",
  XALFEN1W: "XAFEN1",
  XFENT50W: "XFEN50",
};

export function normalizeNarcoticDrugCode(code: string) {
  return NARCOTIC_COMMON_NAME_CODE_ALIASES[code] ?? code;
}

// ---------------------------------------------------------------------------
// 약품 마스터 (StockDrug 호환)
// ---------------------------------------------------------------------------
// ?? ?? ?? ????? ??
// ---------------------------------------------------------------------------
export const NARCOTIC_DRUGS: readonly StockDrug[] = narcoticInventoryData.drugs;
export const narcoticDrugByCode = new Map(NARCOTIC_DRUGS.map((d) => [d.code, d]));
export const NARCOTIC_DRUG_CATEGORY_BY_CODE: Readonly<Record<string, NarcoticCategory>> = narcoticInventoryData.drugCategories;
export function narcoticCategoryOf(code: string): NarcoticCategory {
  return NARCOTIC_DRUG_CATEGORY_BY_CODE[normalizeNarcoticDrugCode(code)] ?? "\ud5a5\uc815";
}

export type NarcoticFloor = {
  floor: string;
  rooms: StockRoom[];
};

export const NARCOTIC_ALLOCATIONS: readonly StockAllocation[] = narcoticInventoryData.allocations;
export const NARCOTIC_ROOMS: readonly StockRoom[] = narcoticInventoryData.rooms;

export const NARCOTIC_FLOORS: readonly NarcoticFloor[] = (() => {
  const floorMap = new Map<string, StockRoom[]>();
  for (const room of narcoticInventoryData.rooms) {
    const floor = room.floor ?? "\uae30\ud0c0";
    const list = floorMap.get(floor) ?? [];
    list.push(room);
    floorMap.set(floor, list);
  }
  return Array.from(floorMap.entries()).map(([floor, rooms]) => ({ floor, rooms }));
})();

export const FIRST_NARCOTIC_ROOM = NARCOTIC_ROOMS[0]?.id ?? "INJ";

// ---------------------------------------------------------------------------
export const NARCOTIC_CHECKLIST: readonly ChecklistItem[] = [
  { section: "마약류 관리", text: "마약류 저장 시설의 개폐와 시건 장치에 이상이 없다." },
  { section: "마약류 관리", text: "보유 중인 비치 마약류는 약품 라벨링을 하여 다른 약품과 분리 보관되어 있다." },
  { section: "마약류 관리", text: "보유 중인 비치 마약류의 종류와 수량에 이상이 없다." },
  { section: "마약류 관리", text: "보유 중인 비치 마약류의 유효기간을 날짜로 월 1회 관리하고 있다." },
  { section: "마약류 관리", text: "마약 저장 시설의 시건 장치 열쇠를 핸드투핸드로 관리하고 있다." },
  { section: "마약류 관리", text: "잔여 마약류 및 폐기 대상 마약류도 마약류 저장 시설에 보관한다." },
  { section: "마약류 관리", text: "마약 관련 폐기물(알루미늄 호일 혹은 앰플 깍지 등)을 지침에 따라 분리 폐기 하고 있다." },
  { section: "마약류 관리", text: "관리자가 마약류저장시설을 주 1회 점검 후 점검부를 매주 작성하고 있다." },
];

export const NARCOTIC_ROUND_SUMMARY_COMMON_GUIDANCE = [
  "1. 병동으로 올라온 마약류는 인계 시 수량과 이상 유무를 확인해 주세요.",
  "2. 마약 타실 때는 반드시 마약 이송함을 지참해 주세요.",
  "3. 약제팀에서 마약류(경구 향정 제외) 인계 시 불출장 인수인계 전산 등록을 반드시 해 주시고",
  "   이송 직원에게 교육 해 주세요.",
  "4. 비치 마약류는 선입 선출이 되도록 관리 해 주세요.",
  "5. 마약류는 절대 자체 폐기 하지 않도록 주의 바랍니다.",
  "   (미사용, 트약 중지 폐기 마약 등은 마약 담당에게 알려 처리 바랍니다.)",
  "6. 잔여 마약 및 폐기대상 마약도 마약류 저장 시설에 보관하시다가 약제팀에 내려 주세요.",
  "7. 마약류 파손 사고 및 분실 사고가 일어나지 않도록 규정에 따라 마약류를 관리 해 주세요.",
  "8. 마약 저장시설 점검부 기록이 누락되지 않도록 1주일에 한 번 반드시 이상 유무 점검 후 서명해서",
  "   법정 보관 기간까지 보관해 주세요. 보건소 감사 시 증빙 자료입니다.",
].join("\n");

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------
export function getNarcoticRoomLabel(roomId: string): string {
  return NARCOTIC_ROOMS.find((r) => r.id === roomId)?.label ?? roomId;
}

export function getNarcoticRoomAllocations(roomId: string): StockAllocation[] {
  return NARCOTIC_ALLOCATIONS.filter((a) => a.roomId === roomId);
}
