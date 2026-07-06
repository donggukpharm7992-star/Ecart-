import { isForcedRefrigeratedDrug } from "./drugRules";
import type { StockDrug } from "./types";

const FORCE_ROOM_STORAGE_CODES = new Set(["XEPIN"]);

type StorageDisplayDrug = Pick<StockDrug, "code" | "productName" | "storage" | "storageType">;

export function isRefrigeratedStorage(storage: string) {
  const value = storage.replace(/\s+/g, "");
  const normalized = value.replace(/[∼～−–—]/g, "-").replace(/℃|°C/gi, "");
  if (normalized.includes("냉장보관하지")) return false;
  return normalized.includes("냉장") || /2(?:-|~)8/.test(normalized);
}

export function isRefrigeratedDrug(drug: StorageDisplayDrug) {
  if (FORCE_ROOM_STORAGE_CODES.has(drug.code)) return false;
  if (isForcedRefrigeratedDrug(drug)) return true;
  return drug.storageType === "REFRIGERATED" || isRefrigeratedStorage(drug.storage);
}

export function inferStorageType(storage: string): StockDrug["storageType"] {
  if (isRefrigeratedStorage(storage)) return "REFRIGERATED";
  const value = storage.replace(/\s+/g, "");
  if (value.includes("차광")) return "LIGHT_PROTECTED";
  return "ROOM";
}

export function storageDisplayLabel(drug: StorageDisplayDrug) {
  if (isRefrigeratedDrug(drug)) return "냉장";
  if (drug.storageType === "LIGHT_PROTECTED") return "차광";
  return "실온";
}
