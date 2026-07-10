import type { StockRoom } from "./types";

const NARCOTIC_WARD_ROW_IDS = [
  ["51", "52", "61", "62", "71", "72"],
  ["81", "82", "91", "92", "RRT"],
  ["101", "102", "111", "112", "121"],
];

export function getNarcoticFloorRows(floor: string, rooms: readonly StockRoom[]) {
  if (floor !== "5층 ~ 12층") return [rooms];
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return NARCOTIC_WARD_ROW_IDS.map((row) => row.flatMap((id) => roomById.get(id) ?? [])).filter((row) => row.length > 0);
}

export function narcoticGuideLabel(room: StockRoom) {
  if (/^\d+$/.test(room.id)) return `${room.id}W`;
  return room.id;
}
