/**
 * narcoticData.ts
 * 비치 향정/마약 현황 데이터 모듈
 *
 * 데이터 소스: 마약/비치향정,마약현황.xlsx (Sheet3)
 * 약품코드: 마약/비치향정,마약현황.xlsx (점검 시트) 매핑
 */

import type { ChecklistItem, StockAllocation, StockDrug, StockRoom } from "./types";

// ---------------------------------------------------------------------------
// 마약류 카테고리 타입
// ---------------------------------------------------------------------------
export type NarcoticCategory = "향정" | "마약";

// ---------------------------------------------------------------------------
// 약품 마스터 (StockDrug 호환)
// ---------------------------------------------------------------------------
const narcoticDrugList: (StockDrug & { narcoticCategory: NarcoticCategory })[] = [
  // ── 향정 ──
  {
    code: "XPOCR5S",
    genericName: "Pocral syr(5ml)",
    productName: "Pocral syr(5ml)",
    spec: "5ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XATIV4W",
    genericName: "Ativan 4mg inj",
    productName: "Ativan 4mg inj",
    spec: "4mg",
    storage: "냉장보관(2-8℃)",
    note: "",
    warning: "",
    storageType: "REFRIGERATED",
    narcoticCategory: "향정",
  },
  {
    code: "XATIV2W",
    genericName: "Ativan 2mg inj",
    productName: "Ativan 2mg inj",
    spec: "2mg",
    storage: "냉장보관(2-8℃)",
    note: "",
    warning: "",
    storageType: "REFRIGERATED",
    narcoticCategory: "향정",
  },
  {
    code: "XKETA5W",
    genericName: "Ketamine 500mg Inj",
    productName: "Ketamine 500mg Inj",
    spec: "500mg",
    storage: "냉장보관(2-8℃)",
    note: "",
    warning: "",
    storageType: "REFRIGERATED",
    narcoticCategory: "향정",
  },
  {
    code: "XDIAZ10W",
    genericName: "Diazepam 10mg/2ml Inj",
    productName: "Diazepam 10mg/2ml Inj",
    spec: "10mg/2ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XMIDZ15W",
    genericName: "Midazolam 15mg/3ml Inj",
    productName: "Midazolam 15mg/3ml Inj",
    spec: "15mg/3ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XMIDZ5W",
    genericName: "Midazolam 5mg/5ml Inj",
    productName: "Midazolam 5mg/5ml Inj",
    spec: "5mg/5ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XNALB10",
    genericName: "Nalbupine 10mg",
    productName: "Nalbupine 10mg",
    spec: "10mg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XPROP1",
    genericName: "Fresofol MCT 1% 15ml Inj",
    productName: "Fresofol MCT 1% 15ml Inj",
    spec: "1% 15ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XPROP1T",
    genericName: "Fresofol MCT 1% 20ml Inj",
    productName: "Fresofol MCT 1% 20ml Inj",
    spec: "1% 20ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XPROP2T",
    genericName: "Fresofol MCT 2% 50ml Inj",
    productName: "Fresofol MCT 2% 50ml Inj",
    spec: "2% 50ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  {
    code: "XPENT5",
    genericName: "Pentothal-sodium 0.5g Inj",
    productName: "Pentothal-sodium 0.5g Inj",
    spec: "0.5g",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "향정",
  },
  // ── 마약 ──
  {
    code: "XALFEN1W",
    genericName: "Alfentanil 1mg Inj",
    productName: "Alfentanil 1mg Inj",
    spec: "1mg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XFENT50W",
    genericName: "Fentanyl 50mcg Inj",
    productName: "Fentanyl 50mcg Inj",
    spec: "50mcg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XFEN500",
    genericName: "Fentanyl 500mcg Inj",
    productName: "Fentanyl 500mcg Inj",
    spec: "500mcg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XFENT100W",
    genericName: "Fentanyl 100mcg Inj (Vial)",
    productName: "Fentanyl 100mcg/2ml inj(HANA)",
    spec: "100mcg/2ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XFENT15",
    genericName: "Fentanyl 1500mcg Inj",
    productName: "Fentanyl 1500mcg Inj",
    spec: "1500mcg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XMORPS5W",
    genericName: "Morphine sulfate 5mg Inj",
    productName: "Morphine sulfate 5mg/5ml inj",
    spec: "5mg/5ml",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XOXCON1W",
    genericName: "Oxynorm 10mg inj",
    productName: "Oxycodone 10mg inj",
    spec: "10mg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XPETH50W",
    genericName: "Pethidine 50mg Inj",
    productName: "Pethidine 50mg Inj(HANA)",
    spec: "50mg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
  {
    code: "XREMIF1W",
    genericName: "Ultian 1mg Inj",
    productName: "Ultian 1mg Inj",
    spec: "1mg",
    storage: "실온보관",
    note: "",
    warning: "",
    storageType: "ROOM",
    narcoticCategory: "마약",
  },
];

export const NARCOTIC_DRUGS: readonly StockDrug[] = narcoticDrugList;
export const narcoticDrugByCode = new Map(narcoticDrugList.map((d) => [d.code, d]));
export const NARCOTIC_DRUG_CATEGORY_BY_CODE: Readonly<Record<string, NarcoticCategory>> = Object.fromEntries(
  narcoticDrugList.map((drug) => [drug.code, drug.narcoticCategory]),
);
export function narcoticCategoryOf(code: string): NarcoticCategory {
  return NARCOTIC_DRUG_CATEGORY_BY_CODE[code] ?? "향정";
}

// ---------------------------------------------------------------------------
// 실(Room) 마스터 – Excel Sheet3 전체 실 포함 (보유 약품 없어도)
// ---------------------------------------------------------------------------
export type NarcoticFloor = {
  floor: string;
  rooms: StockRoom[];
};

const roomDefs: { id: string; label: string; floor: string }[] = [
  // 1층
  { id: "INJ", label: "INJ", floor: "1층" },
  { id: "DREMM", label: "DREMM", floor: "1층" },
  { id: "ER", label: "ER (응급실)", floor: "1층" },
  // 2층
  { id: "GICLA", label: "GICLA", floor: "2층" },
  { id: "HBEF", label: "HBEF", floor: "2층" },
  { id: "MICU", label: "MICU (내과중환자실)", floor: "2층" },
  // 3층
  { id: "AN", label: "AN (마취통증의학과)", floor: "3층" },
  { id: "OR", label: "OR (수술실)", floor: "3층" },
  { id: "SICU", label: "SICU (외과중환자실)", floor: "3층" },
  // 4층
  { id: "ADR", label: "ADR", floor: "4층" },
  { id: "HPC", label: "HPC", floor: "4층" },
  { id: "난임", label: "난임", floor: "4층" },
  { id: "DRL", label: "DRL", floor: "4층" },
  { id: "NICU", label: "NICU (신생아중환자실)", floor: "4층" },
  { id: "42", label: "42병동", floor: "4층" },
  // 병동
  { id: "51", label: "51병동", floor: "5층 ~ 12층" },
  { id: "52", label: "52병동", floor: "5층 ~ 12층" },
  { id: "61", label: "61병동", floor: "5층 ~ 12층" },
  { id: "62", label: "62병동", floor: "5층 ~ 12층" },
  { id: "71", label: "71병동", floor: "5층 ~ 12층" },
  { id: "72", label: "72병동", floor: "5층 ~ 12층" },
  { id: "81", label: "81병동", floor: "5층 ~ 12층" },
  { id: "82", label: "82병동", floor: "5층 ~ 12층" },
  { id: "91", label: "91병동", floor: "5층 ~ 12층" },
  { id: "92", label: "92병동", floor: "5층 ~ 12층" },
  { id: "101", label: "101병동", floor: "5층 ~ 12층" },
  { id: "102", label: "102병동", floor: "5층 ~ 12층" },
  { id: "111", label: "111병동", floor: "5층 ~ 12층" },
  { id: "112", label: "112병동", floor: "5층 ~ 12층" },
  { id: "121", label: "121병동", floor: "5층 ~ 12층" },
];

function toStockRoom(def: { id: string; label: string }, allocCount: number, totalQty: number): StockRoom {
  return {
    id: def.id,
    label: def.label,
    sourceColumn: def.id,
    sourceSheet: "비치향정,마약현황",
    sourceUpdatedAt: "",
    allocationCount: allocCount,
    totalQuantity: totalQty,
  };
}

// ---------------------------------------------------------------------------
// 배정(Allocation) 데이터 – Sheet3 기준
// ---------------------------------------------------------------------------
const rawAllocations: { code: string; roomId: string; qty: number }[] = [
  // ── 향정 ──
  // Pocral syr(5ml)
  { code: "XPOCR5S", roomId: "DREMM", qty: 10 },
  // Ativan 4mg inj
  { code: "XATIV4W", roomId: "AN", qty: 2 },
  { code: "XATIV4W", roomId: "121", qty: 2 },
  // Ativan 2mg inj
  { code: "XATIV2W", roomId: "ER", qty: 5 },
  { code: "XATIV2W", roomId: "GICLA", qty: 2 },
  { code: "XATIV2W", roomId: "MICU", qty: 3 },
  { code: "XATIV2W", roomId: "SICU", qty: 5 },
  { code: "XATIV2W", roomId: "ADR", qty: 2 },
  { code: "XATIV2W", roomId: "NICU", qty: 2 },
  { code: "XATIV2W", roomId: "42", qty: 1 },
  { code: "XATIV2W", roomId: "71", qty: 1 },
  { code: "XATIV2W", roomId: "72", qty: 2 },
  { code: "XATIV2W", roomId: "81", qty: 2 },
  { code: "XATIV2W", roomId: "82", qty: 2 },
  { code: "XATIV2W", roomId: "91", qty: 2 },
  { code: "XATIV2W", roomId: "92", qty: 2 },
  { code: "XATIV2W", roomId: "101", qty: 5 },
  { code: "XATIV2W", roomId: "102", qty: 1 },
  { code: "XATIV2W", roomId: "111", qty: 2 },
  { code: "XATIV2W", roomId: "112", qty: 3 },
  { code: "XATIV2W", roomId: "121", qty: 5 },
  // Ketamine 500mg Inj
  { code: "XKETA5W", roomId: "ER", qty: 2 },
  { code: "XKETA5W", roomId: "GICLA", qty: 5 },
  { code: "XKETA5W", roomId: "MICU", qty: 1 },
  { code: "XKETA5W", roomId: "AN", qty: 2 },
  { code: "XKETA5W", roomId: "72", qty: 1 },
  // Diazepam 10mg/2ml Inj
  { code: "XDIAZ10W", roomId: "DRL", qty: 3 },
  { code: "XDIAZ10W", roomId: "91", qty: 1 },
  { code: "XDIAZ10W", roomId: "101", qty: 1 },
  { code: "XDIAZ10W", roomId: "121", qty: 2 },
  // Midazolam 15mg/3ml Inj
  { code: "XMIDZ15W", roomId: "HBEF", qty: 3 },
  { code: "XMIDZ15W", roomId: "MICU", qty: 3 },
  { code: "XMIDZ15W", roomId: "AN", qty: 3 },
  { code: "XMIDZ15W", roomId: "SICU", qty: 5 },
  // Midazolam 5mg/5ml Inj
  { code: "XMIDZ5W", roomId: "DREMM", qty: 10 },
  { code: "XMIDZ5W", roomId: "ER", qty: 4 },
  { code: "XMIDZ5W", roomId: "GICLA", qty: 80 },
  { code: "XMIDZ5W", roomId: "HBEF", qty: 4 },
  { code: "XMIDZ5W", roomId: "MICU", qty: 3 },
  { code: "XMIDZ5W", roomId: "AN", qty: 20 },
  { code: "XMIDZ5W", roomId: "OR", qty: 1 },
  { code: "XMIDZ5W", roomId: "SICU", qty: 5 },
  { code: "XMIDZ5W", roomId: "HPC", qty: 70 },
  { code: "XMIDZ5W", roomId: "DRL", qty: 3 },
  { code: "XMIDZ5W", roomId: "NICU", qty: 3 },
  { code: "XMIDZ5W", roomId: "61", qty: 1 },
  { code: "XMIDZ5W", roomId: "62", qty: 1 },
  { code: "XMIDZ5W", roomId: "71", qty: 1 },
  { code: "XMIDZ5W", roomId: "72", qty: 1 },
  { code: "XMIDZ5W", roomId: "81", qty: 1 },
  { code: "XMIDZ5W", roomId: "82", qty: 2 },
  { code: "XMIDZ5W", roomId: "91", qty: 3 },
  { code: "XMIDZ5W", roomId: "92", qty: 1 },
  { code: "XMIDZ5W", roomId: "101", qty: 2 },
  { code: "XMIDZ5W", roomId: "102", qty: 1 },
  { code: "XMIDZ5W", roomId: "111", qty: 2 },
  { code: "XMIDZ5W", roomId: "112", qty: 3 },
  // Nalbupine 10mg
  { code: "XNALB10", roomId: "DRL", qty: 3 },
  // Fresofol MCT 1% 15ml Inj
  { code: "XPROP1", roomId: "GICLA", qty: 5 },
  { code: "XPROP1", roomId: "HBEF", qty: 2 },
  { code: "XPROP1", roomId: "AN", qty: 30 },
  // Fresofol MCT 1% 20ml Inj
  { code: "XPROP1T", roomId: "AN", qty: 20 },
  // Fresofol MCT 2% 50ml Inj
  { code: "XPROP2T", roomId: "HBEF", qty: 1 },
  { code: "XPROP2T", roomId: "AN", qty: 20 },
  // Pentothal-sodium 0.5g Inj
  { code: "XPENT5", roomId: "AN", qty: 40 },

  // ── 마약 ──
  // Alfentanil 1mg Inj
  { code: "XALFEN1W", roomId: "AN", qty: 10 },
  // Fentanyl 50mcg Inj
  { code: "XFENT50W", roomId: "DREMM", qty: 15 },
  { code: "XFENT50W", roomId: "GICLA", qty: 10 },
  { code: "XFENT50W", roomId: "HBEF", qty: 4 },
  { code: "XFENT50W", roomId: "AN", qty: 20 },
  // Fentanyl 500mcg Inj
  { code: "XFEN500", roomId: "AN", qty: 20 },
  // Fentanyl 100mcg Inj (Vial)
  { code: "XFENT100W", roomId: "AN", qty: 30 },
  // Fentanyl 1500mcg Inj
  { code: "XFENT15", roomId: "AN", qty: 10 },
  // Morphine sulfate 5mg Inj
  { code: "XMORPS5W", roomId: "HBEF", qty: 4 },
  { code: "XMORPS5W", roomId: "112", qty: 6 },
  // Oxynorm 10mg inj
  { code: "XOXCON1W", roomId: "112", qty: 3 },
  // Pethidine 50mg Inj
  { code: "XPETH50W", roomId: "DREMM", qty: 10 },
  { code: "XPETH50W", roomId: "GICLA", qty: 40 },
  { code: "XPETH50W", roomId: "HBEF", qty: 2 },
  { code: "XPETH50W", roomId: "AN", qty: 5 },
  { code: "XPETH50W", roomId: "HPC", qty: 25 },
  // Ultian 1mg Inj
  { code: "XREMIF1W", roomId: "HBEF", qty: 3 },
  { code: "XREMIF1W", roomId: "AN", qty: 39 },
];

export const NARCOTIC_ALLOCATIONS: readonly StockAllocation[] = rawAllocations.map(({ code, roomId, qty }) => ({
  roomId,
  drugCode: code,
  requiredQty: qty,
}));

// Compute room stats
const roomStats = new Map<string, { count: number; total: number }>();
for (const a of rawAllocations) {
  const s = roomStats.get(a.roomId) ?? { count: 0, total: 0 };
  s.count += 1;
  s.total += a.qty;
  roomStats.set(a.roomId, s);
}

export const NARCOTIC_ROOMS: readonly StockRoom[] = roomDefs.map((def) => {
  const s = roomStats.get(def.id) ?? { count: 0, total: 0 };
  return toStockRoom(def, s.count, s.total);
});

export const NARCOTIC_FLOORS: readonly NarcoticFloor[] = (() => {
  const floorMap = new Map<string, StockRoom[]>();
  for (const def of roomDefs) {
    const list = floorMap.get(def.floor) ?? [];
    const room = NARCOTIC_ROOMS.find((r) => r.id === def.id)!;
    list.push(room);
    floorMap.set(def.floor, list);
  }
  return Array.from(floorMap.entries()).map(([floor, rooms]) => ({ floor, rooms }));
})();

export const FIRST_NARCOTIC_ROOM = NARCOTIC_ROOMS[0]?.id ?? "INJ";

// ---------------------------------------------------------------------------
// 체크리스트 – 사용자 지정 8개 항목
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
