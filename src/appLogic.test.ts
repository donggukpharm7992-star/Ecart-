import { describe, expect, it } from "vitest";
import {
  buildStockLabelData,
  getDrugLabelFlagLabels,
  getInitialAppMode,
  getInitialMasterKindFilter,
  matchesMasterRoom,
  normalizeLabelCautionLabels,
  resolveMasterLabelRoomId,
  resolveDrugLabelPrintRow,
} from "./appLogic";
import type { MasterRow } from "./inventoryState";
import type { StockRoom } from "./types";

const baseRow: MasterRow = {
  code: "XATIV2W",
  genericName: "Ativan 2mg inj",
  productName: "Ativan 2mg inj",
  spec: "2mg",
  storage: "실온보관",
  note: "",
  warning: "",
  storageType: "ROOM",
  masterKind: "psychotropic",
  totalQuantity: 1,
  roomDetails: [],
};

describe("app label logic", () => {
  it("recognizes the narcotic viewer route and defaults its master filter to narcotic kinds", () => {
    expect(getInitialAppMode("/Ecart-/narcotic-viewer", "")).toBe("narcotic-viewer");
    expect(getInitialAppMode("/Ecart-/", "?view=narcotic")).toBe("narcotic-viewer");
    expect(getInitialMasterKindFilter("narcotic-viewer")).toEqual({ stock: false, psychotropic: true, narcotic: true });
  });

  it("adds narcotic categories to stock label caution text while preserving cold storage", () => {
    const label = buildStockLabelData(baseRow, "stock");

    expect(label.cautionLabels).toEqual(["향정"]);
    expect(normalizeLabelCautionLabels(label.cautionLabels, label.highRisk)).toEqual(["향정"]);
    expect(label.storageLabel).toBe("냉장");
    expect(label.storageTone).toBe("cold");
    expect(label.storage).toContain("냉장");
    expect(getDrugLabelFlagLabels(label)).toEqual(["향정"]);
    expect(getDrugLabelFlagLabels({ ...label, cautionLabels: [], categoryLabel: "향정" })).toEqual(["향정"]);
  });

  it("keeps room quantity and narcotic category from the selected master label row", () => {
    const roomRow = { ...baseRow, roomDetails: [{ roomId: "ER", requiredQty: 5 }] };
    const selectedLabel = buildStockLabelData(roomRow, "stock", "ER");
    const fallbackLabel = buildStockLabelData(roomRow, "stock");

    const printable = resolveDrugLabelPrintRow(
      {
        labelRow: selectedLabel,
        roomId: selectedLabel.roomId,
        quantityOverride: selectedLabel.totalQuantity,
      },
      fallbackLabel,
    );

    expect(printable?.cautionLabels).toEqual(["향정"]);
    expect(printable?.storageLabel).toBe("냉장");
    expect(printable?.totalQuantity).toBe(5);
    expect(printable?.quantityLabel).toBe("수량");
  });

  it("treats room searches as room allocation matches, not drug-name substring matches", () => {
    const ativanWithoutAn = { ...baseRow, roomDetails: [{ roomId: "ER", requiredQty: 5 }] };
    const ativanWithAn = { ...baseRow, code: "XATIV4W", productName: "Ativan 4mg inj", roomDetails: [{ roomId: "AN", requiredQty: 2 }] };

    expect(matchesMasterRoom(ativanWithoutAn, "AN")).toBe(false);
    expect(matchesMasterRoom(ativanWithAn, "AN")).toBe(true);
    expect(buildStockLabelData(ativanWithAn, "stock", "AN").totalQuantity).toBe(2);
  });

  it("treats HBEF Korean stock room and narcotic HBEF room as the same label room", () => {
    const rooms: StockRoom[] = [
      {
        id: "HBEF심혈관조영실",
        label: "HBEF심혈관조영실",
        sourceColumn: "HBEF심혈관조영실",
        sourceSheet: "HBEF",
        sourceUpdatedAt: "",
        allocationCount: 1,
        totalQuantity: 1,
      },
      {
        id: "HBEF",
        label: "HBEF",
        sourceColumn: "HBEF",
        sourceSheet: "HBEF",
        sourceUpdatedAt: "",
        allocationCount: 1,
        totalQuantity: 2,
      },
    ];
    const selectedRoomId = resolveMasterLabelRoomId("HBEF", rooms);
    const fresofol = {
      ...baseRow,
      code: "XPROP1",
      productName: "Fresofol MCT 1% 15ml Inj",
      genericName: "Fresofol MCT 1% 15ml Inj",
      roomDetails: [{ roomId: "HBEF", requiredQty: 2 }],
    };

    expect(selectedRoomId).toBe("HBEF심혈관조영실");
    expect(resolveMasterLabelRoomId("심혈관조영실", rooms)).toBe("HBEF심혈관조영실");
    expect(matchesMasterRoom(fresofol, selectedRoomId)).toBe(true);
    expect(buildStockLabelData(fresofol, "stock", selectedRoomId).totalQuantity).toBe(2);
  });
});
