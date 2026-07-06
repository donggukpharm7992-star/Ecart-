import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildNarcoticLotAssignments, isNarcoticLotWorkbookFileName, narcoticLotKey, readNarcoticLotWorkbook } from "./narcoticLot";

describe("narcotic lot assignments", () => {
  const sampleXlsPath = join(process.cwd(), "마약", "의약품_재고_상세_20260703.xls");

  it("accepts the downloaded drug stock detail workbook filename format", () => {
    expect(isNarcoticLotWorkbookFileName("의약품_재고_상세_20260704")).toBe(true);
    expect(isNarcoticLotWorkbookFileName("의약품_재고_상세_20260704.xlsx")).toBe(true);
    expect(isNarcoticLotWorkbookFileName("의약품_재고_상세_20260704.xlsm")).toBe(true);
    expect(isNarcoticLotWorkbookFileName("다른_파일_20260704.xlsx")).toBe(false);
  });

  it("maps uploaded storage lots to room and pharmacy lot columns", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "HBEF", lot: "HBEF-1", expiryDate: "2026-01-01", drugCode: "XMIDZ15W" },
        { storage: "HBEF", lot: "HBEF-2", expiryDate: "2026-02-01", drugCode: "XMIDZ15W" },
        { storage: "DREMM", lot: "DREMM-1", expiryDate: "2026-03-01", drugCode: "XMIDZ5W" },
        { storage: "기타 보관소", lot: "ETC-1", expiryDate: "2026-04-01", drugCode: "XATIV2W" },
        { storage: "조제실", lot: "PHARM-OLD", expiryDate: "2026-05-01", drugCode: "XATIV2W" },
        { storage: "조제실", lot: "PHARM-NEW", expiryDate: "2026-08-01", drugCode: "XATIV2W" },
      ],
      roomIds: ["HBEF", "DREMM", "ER", "AN", "HPC", "GICLA"],
      drugCodes: ["XMIDZ15W", "XMIDZ5W", "XATIV2W"],
    });

    expect(assignments[narcoticLotKey("HBEF", "XMIDZ15W")]).toEqual({ roomLot: "HBEF-1, HBEF-2", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("DREMM", "XMIDZ5W")]).toEqual({ roomLot: "DREMM-1", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("ER", "XATIV2W")]).toEqual({ roomLot: "ETC-1", pharmacyLot: "PHARM-NEW" });
    expect(assignments[narcoticLotKey("AN", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "PHARM-NEW" });
    expect(assignments[narcoticLotKey("HPC", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "PHARM-NEW" });
    expect(assignments[narcoticLotKey("GICLA", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "PHARM-NEW" });
  });

  it("matches uploaded standard-code rows by drug name when hospital stock codes are different", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "조제실", lot: "2511126201002065", expiryDate: 47045, drugCode: "8800000000000", drugName: "Ativan 2mg inj" },
        { storage: "심혈관조영실HBEF", lot: "HBEF-ULTIAN", expiryDate: 47000, drugName: "Ultian 1mg inj" },
      ],
      roomIds: ["42", "HBEF"],
      drugCodes: ["XATIV2W", "XREMIF1W"],
      drugs: [
        { code: "XATIV2W", productName: "Ativan 2mg inj" },
        { code: "XREMIF1W", productName: "Ultian 1mg Inj" },
      ],
    });

    expect(assignments[narcoticLotKey("42", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "2511126201002065" });
    expect(assignments[narcoticLotKey("HBEF", "XREMIF1W")]).toEqual({ roomLot: "HBEF-ULTIAN", pharmacyLot: "" });
  });

  it("matches uploaded drug names that include extra concentration or volume text", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "심혈관조영실HBEF", lot: "16UD3712", drugCode: "8806509018728", drugName: "FRESOFOL MCT 1% Inj 150mg/15ml" },
        { storage: "심혈관조영실HBEF", lot: "BQY801", drugCode: "8800000000000", drugName: "Fentanyl 50mcg/ml inj" },
        { storage: "심혈관조영실HBEF", lot: "25004", drugCode: "8800000000001", drugName: "Pethidine 50mg/1ml inj (HANA)" },
      ],
      roomIds: ["HBEF"],
      drugCodes: ["XPROP1", "XFENT50W", "XPETH50W"],
      drugs: [
        { code: "XPROP1", productName: "Fresofol MCT 1% 15ml Inj" },
        { code: "XFENT50W", productName: "Fentanyl 50mcg Inj" },
        { code: "XPETH50W", productName: "Pethidine 50mg Inj(HANA)" },
      ],
    });

    expect(assignments[narcoticLotKey("HBEF", "XPROP1")]).toEqual({ roomLot: "16UD3712", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("HBEF", "XFENT50W")]).toEqual({ roomLot: "BQY801", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("HBEF", "XPETH50W")]).toEqual({ roomLot: "25004", pharmacyLot: "" });
  });

  it("uses the narcotic drug name-code conversion map before fuzzy name matching", () => {
    const input = {
      rows: [{ storage: "심혈관조영실HBEF", lot: "MAP-LOT", drugCode: "8800000000000", drugName: "Uploaded Alias Name" }],
      roomIds: ["HBEF"],
      drugCodes: ["XMIDZ5W"],
      drugs: [{ code: "XMIDZ5W", productName: "Midazolam 5mg/5ml Inj" }],
      drugNameCodeMap: [{ drugName: "Uploaded Alias Name", drugCode: "XMIDZ5W" }],
    } as Parameters<typeof buildNarcoticLotAssignments>[0] & {
      drugNameCodeMap: Array<{ drugName: string; drugCode: string }>;
    };

    const assignments = buildNarcoticLotAssignments(input);

    expect(assignments[narcoticLotKey("HBEF", "XMIDZ5W")]).toEqual({ roomLot: "MAP-LOT", pharmacyLot: "" });
  });

  it("uses the conversion drug name to reach the app code when conversion codes differ", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [{ storage: "심혈관조영실HBEF", lot: "25075", drugCode: "8806422007021", drugName: "Midazolam 5mg/5ml inj" }],
      roomIds: ["HBEF"],
      drugCodes: ["XMIDZ5W"],
      drugs: [{ code: "XMIDZ5W", productName: "Midazolam 5mg/5ml Inj" }],
      drugNameCodeMap: [{ drugName: "Midazolam 5mg/5ml inj", drugCode: "XMIDA5" }],
    });

    expect(assignments[narcoticLotKey("HBEF", "XMIDZ5W")]).toEqual({ roomLot: "25075", pharmacyLot: "" });
  });

  it("matches drug names by meaningful prefix and equivalent concentration dose", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "기타병동", lot: "VDJ502", drugCode: "8800000000000", drugName: "Ketamine HCl 50mg/ml inj" },
      ],
      roomIds: ["MICU"],
      drugCodes: ["XKETA5W"],
      drugs: [{ code: "XKETA5W", productName: "Ketamine 500mg Inj" }],
      drugNameCodeMap: [{ drugName: "Ketamine HCl 500mg/10ml Inj", drugCode: "XKETA5" }],
    });

    expect(assignments[narcoticLotKey("MICU", "XKETA5W")]).toEqual({ roomLot: "VDJ502", pharmacyLot: "" });
  });

  it("uses exact conversion-name code aliases before equivalent concentration matching", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "마취통증의학과AN", lot: "BQYO01", drugCode: "8806453032825", drugName: "Fentanyl 50mcg/ml inj" },
        {
          storage: "마취통증의학과AN",
          lot: "226202",
          drugCode: "8806578022749",
          drugName: "Fentanyl 100mcg/2ml inj(HANA)",
        },
      ],
      roomIds: ["AN"],
      drugCodes: ["XFENT50W", "XFENT100W"],
      drugs: [
        { code: "XFENT50W", productName: "Fentanyl 50mcg Inj" },
        { code: "XFENT100W", productName: "Fentanyl 100mcg/2ml inj(HANA)" },
      ],
      drugNameCodeMap: [
        { drugName: "Fentanyl 50mcg/ml inj", drugCode: "XFEN50" },
        { drugName: "Fentanyl 100mcg/2ml inj(HANA)", drugCode: "XFENT100W" },
      ],
    });

    expect(assignments[narcoticLotKey("AN", "XFENT50W")]).toEqual({ roomLot: "BQYO01", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("AN", "XFENT100W")]).toEqual({ roomLot: "226202", pharmacyLot: "" });
  });

  it("maps uploaded code-only rows through conversion names when app drug codes differ", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "마취통증의학(AN)", lot: "ATIV4-LOT", drugCode: "XLZPAM4" },
        { storage: "심혈관조영실HBEF", lot: "FENT50-LOT", drugCode: "XFEN50" },
        { storage: "기타병동", lot: "KETA-LOT", drugCode: "XKETA5" },
      ],
      roomIds: ["AN", "HBEF", "ER"],
      drugCodes: ["XATIV4W", "XFENT50W", "XKETA5W"],
      drugs: [
        { code: "XATIV4W", productName: "Ativan 4mg inj" },
        { code: "XFENT50W", productName: "Fentanyl 50mcg Inj" },
        { code: "XKETA5W", productName: "Ketamine 500mg Inj" },
      ],
      drugNameCodeMap: [
        { drugName: "Ativan 4mg/1ml inj", drugCode: "XLZPAM4" },
        { drugName: "Fentanyl 50mcg/ml inj", drugCode: "XFEN50" },
        { drugName: "Ketamine HCl 500mg/10ml Inj", drugCode: "XKETA5" },
      ],
    });

    expect(assignments[narcoticLotKey("AN", "XATIV4W")]).toEqual({ roomLot: "ATIV4-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("HBEF", "XFENT50W")]).toEqual({ roomLot: "FENT50-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("ER", "XKETA5W")]).toEqual({ roomLot: "KETA-LOT", pharmacyLot: "" });
  });

  it("matches remaining narcotic upload aliases with hospital spelling variants", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "기타병동", lot: "NALB-LOT", drugCode: "XNALBUP10W" },
        { storage: "기타병동", lot: "OXY-LOT", drugName: "Ocodone 10mg/1ml inj" },
        { storage: "마취통증의학과AN", lot: "PENT-LOT", drugName: "Advanz thiopental 500mg inj" },
      ],
      roomIds: ["DRL", "112", "AN"],
      drugCodes: ["XNALB10", "XOXCON1W", "XPENT5"],
      drugs: [
        { code: "XNALB10", productName: "Nalbupine 10mg" },
        { code: "XOXCON1W", genericName: "Oxynorm 10mg inj", productName: "Oxycodone 10mg inj" },
        { code: "XPENT5", productName: "Pentothal-sodium 0.5g Inj" },
      ],
    });

    expect(assignments[narcoticLotKey("DRL", "XNALB10")]).toEqual({ roomLot: "NALB-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("112", "XOXCON1W")]).toEqual({ roomLot: "OXY-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("AN", "XPENT5")]).toEqual({ roomLot: "PENT-LOT", pharmacyLot: "" });
  });

  it("follows room-specific lot rules from the narcotic rule workbook", () => {
    const assignments = buildNarcoticLotAssignments({
      rows: [
        { storage: "마취통증의학(AN)", lot: "AN-LOT", drugCode: "XATIV4W" },
        { storage: "동서의학건진센터HPC", lot: "HPC-LOT", drugCode: "XMIDZ5W" },
        { storage: "소화기병검사실GICLA", lot: "GICLA-LOT", drugCode: "XKETA5W" },
        { storage: "기타병동", lot: "WARD-LOT", drugCode: "XATIV2W" },
      ],
      roomIds: ["AN", "HPC", "GICLA", "DREMM", "HBEF", "ER", "42"],
      drugCodes: ["XATIV4W", "XMIDZ5W", "XKETA5W", "XATIV2W"],
    });

    expect(assignments[narcoticLotKey("AN", "XATIV4W")]).toEqual({ roomLot: "AN-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("HPC", "XMIDZ5W")]).toEqual({ roomLot: "HPC-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("GICLA", "XKETA5W")]).toEqual({ roomLot: "GICLA-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("ER", "XATIV2W")]).toEqual({ roomLot: "WARD-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("42", "XATIV2W")]).toEqual({ roomLot: "WARD-LOT", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("AN", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("DREMM", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "" });
    expect(assignments[narcoticLotKey("HBEF", "XATIV2W")]).toEqual({ roomLot: "", pharmacyLot: "" });
  });

  it.skipIf(!existsSync(sampleXlsPath))("reads the hospital drug stock detail .xls workbook", async () => {
    const bytes = readFileSync(sampleXlsPath);
    const file = new File([new Uint8Array(bytes)], "의약품_재고_상세_20260703.xls");
    const rows = await readNarcoticLotWorkbook(file);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((row) => row.storage.includes("조제실") && row.lot)).toBe(true);
    expect(rows.some((row) => row.drugName?.includes("Ativan"))).toBe(true);
  });
});
