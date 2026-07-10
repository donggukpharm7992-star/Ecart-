import { describe, expect, it } from "vitest";
import {
  A3_PAPER,
  A4_PAPER,
  DEFAULT_PHARMACY_LABEL_STYLE,
  PHARMACY_LABEL_REPOSITORY_KEY,
  createEmptyPharmacyLabelDraft,
  createMatchedPharmacyLabelDraft,
  groupPharmacyLabelsForPaper,
  loadSavedPharmacyLabelsFromStorage,
  resolvePharmacyLabelDraft,
  savePharmacyLabelToStorage,
  type PharmacySavedLabel,
} from "./pharmacyLabelStudio";
import type { PharmacyLabelMatchRow } from "./pharmacyLabelMatches";

const row: PharmacyLabelMatchRow = {
  code: "A.01W-T",
  englishName: "Atropine oph 0.01% 5mL",
  koreanName: "아트로핀",
  strength: "0.01%",
  spec: "5mL",
  package: "",
  storage: "차광",
  lightProtected: true,
  refrigerated: false,
  doseCaution: false,
  similarSound: false,
  similarLook: false,
  highRisk: false,
  highCaution: false,
  anticancer: false,
  narcotic: false,
  psychotropic: false,
  highCost: false,
  nameCaution: false,
  matchedLabel: "Atropine oph 0.01% 5ml 아트로핀 0.01% 점안액",
  sourceFile: "약품개별 라벨.xlsx",
  sourceLocation: "외용바구니!A14",
  matchStatus: "확정",
  matchScore: 103,
  matchReason: "name",
  conditionSource: "",
  reviewMemo: "",
};

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("pharmacy label studio", () => {
  it("creates matched drafts with the default size and no empty footer", () => {
    const draft = createMatchedPharmacyLabelDraft(row);

    expect(draft.code).toBe("A.01W-T");
    expect(draft.size).toEqual({ presetKey: "35x100", widthMm: 100, heightMm: 35 });
    expect(draft.printable.footer.enabled).toBe(false);
    expect(draft.printable.title).toContain("Atropine");
    expect(draft.style).toEqual(DEFAULT_PHARMACY_LABEL_STYLE);
  });

  it("creates warning text from storage, light protection, and caution flags", () => {
    const draft = createMatchedPharmacyLabelDraft({
      ...row,
      storage: "냉동",
      lightProtected: true,
      refrigerated: false,
      doseCaution: true,
      similarSound: true,
      similarLook: true,
      highRisk: true,
    });

    expect(draft.printable.warning).toContain("차광");
    expect(draft.printable.warning).toContain("냉동");
    expect(draft.printable.warning).toContain("용량주의");
    expect(draft.printable.warning).toContain("유사발음");
    expect(draft.printable.warning).toContain("유사모양");
    expect(draft.printable.warning).toContain("고위험의약품");
  });

  it("uses the latest saved label before workbook and new-label defaults", () => {
    const saved: PharmacySavedLabel = {
      id: "saved-1",
      code: "A.01W-T",
      labelType: "drug-name",
      size: { presetKey: "custom", widthMm: 90, heightMm: 30 },
      printable: { title: "수정 라벨", warning: "차광", footer: { enabled: false, text: "" } },
      style: DEFAULT_PHARMACY_LABEL_STYLE,
      sourceType: "manual",
      savedAt: "2026-07-02T01:00:00.000Z",
    };

    expect(resolvePharmacyLabelDraft(row, [saved]).printable.title).toBe("수정 라벨");
    expect(resolvePharmacyLabelDraft(row, []).sourceType).toBe("matched-workbook");
    expect(createEmptyPharmacyLabelDraft("NEW1", "신규약품").sourceType).toBe("new");
  });

  it("groups selected labels by paper size for batch printing", () => {
    const labels = Array.from({ length: 40 }, (_, index) => ({
      ...createMatchedPharmacyLabelDraft(row),
      id: `draft-${index}`,
    }));

    const a4Pages = groupPharmacyLabelsForPaper(labels, A4_PAPER).length;
    const a3Pages = groupPharmacyLabelsForPaper(labels, A3_PAPER).length;

    expect(a4Pages).toBeGreaterThan(1);
    expect(a3Pages).toBeLessThan(a4Pages);
  });

  it("stores and reloads saved labels by code", () => {
    const storage = new MemoryStorage();
    const draft = createMatchedPharmacyLabelDraft(row);
    const saved = savePharmacyLabelToStorage(storage, draft, new Date("2026-07-02T00:00:00.000Z"));

    expect(storage.getItem(PHARMACY_LABEL_REPOSITORY_KEY)).toContain("A.01W-T");
    expect(loadSavedPharmacyLabelsFromStorage(storage)).toEqual([saved]);
  });
});
