import narcoticDrugCodeMapRows from "./data/narcoticDrugCodeMap.generated.json";

export type NarcoticLotSourceRow = {
  storage: string;
  lot: string;
  expiryDate?: string | number;
  drugCode?: string | number;
  drugName?: string;
};

export type NarcoticLotValue = {
  roomLot: string;
  pharmacyLot: string;
};

type LotCandidate = {
  lot: string;
  expiryTime: number;
};

export type NarcoticDrugNameCodeMapEntry = {
  drugName: string;
  drugCode: string;
};

type BuildNarcoticLotAssignmentsInput = {
  rows: NarcoticLotSourceRow[];
  roomIds: string[];
  drugCodes: string[];
  drugs?: Array<{
    code: string;
    genericName?: string;
    productName?: string;
    name?: string;
  }>;
  drugNameCodeMap?: NarcoticDrugNameCodeMapEntry[];
};

export function narcoticLotKey(roomId: string, drugCode: string) {
  return `${roomId}::${drugCode}`;
}

export function isNarcoticLotWorkbookFileName(fileName: string) {
  const normalized = fileName.normalize("NFC").trim().replace(/\s+/g, "_");
  return /^의약품_재고_상세_\d{8}(?:\.(?:xlsx|xlsm|xls))?$/i.test(normalized);
}

const narcoticUploadCodeAliases = new Map([
  ["XPOCR5S", "CHR5-S"],
  ["XATIV2W", "XLZPAM2"],
  ["XATIV4W", "XLZPAM4"],
  ["XFENT50W", "XFEN50"],
  ["XKETA5W", "XKETA5"],
  ["XDIAZ10W", "XDDP"],
  ["XMIDZ15W", "XMIDA15"],
  ["XMIDZ5W", "XMIDA5"],
  ["XNALB10", "XNALBUP10W"],
  ["XPROP1", "XPROPO115W"],
  ["XPROP1T", "XPROPO120"],
  ["XPROP2T", "XPROPO250"],
  ["XPENT5", "XPTS500W"],
]);

function normalizeValue(value: string | number | undefined) {
  return String(value ?? "").trim();
}

function normalizeDrugCode(value: string | number | undefined) {
  return normalizeValue(value).toUpperCase();
}

function normalizeDrugMatchText(value: string | number | undefined) {
  return normalizeValue(value)
    .toLowerCase()
    .replace(/\bnalbuphine\b/g, "nalbupine")
    .replace(/\bocodone\b/g, "oxycodone")
    .replace(/\bpentothal\b/g, "thiopental")
    .replace(/명칭\s*:/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

function drugMatchTokens(value: string | number | undefined) {
  return (
    normalizeValue(value)
      .toLowerCase()
      .replace(/\bnalbuphine\b/g, "nalbupine")
      .replace(/\bocodone\b/g, "oxycodone")
      .replace(/\bpentothal\b/g, "thiopental")
      .replace(/명칭\s*:/g, "")
      .replace(/\([^)]*\)/g, " ")
      .match(/[a-z가-힣]+|\d+(?:\.\d+)?\s*(?:mcg|mg|ml|g|iu|unit|%)?/g) ?? []
  )
    .map((token) => token.replace(/\s+/g, ""))
    .filter((token) => token && !["inj", "tab", "cap", "vial"].includes(token));
}

type DrugDoseInfo = {
  totalMassesMg: number[];
  concentrationsMgPerMl: number[];
};

const nonDrugNameTokens = new Set([
  "advanz",
  "hcl",
  "hydrochloride",
  "inj",
  "injection",
  "sodium",
  "tab",
  "cap",
  "vial",
  "amp",
  "ampoule",
]);

function toMilligrams(value: number, unit: string) {
  switch (unit.toLowerCase()) {
    case "g":
      return value * 1000;
    case "mcg":
      return value / 1000;
    default:
      return value;
  }
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => Number(value.toFixed(6))))];
}

function parseDrugDoseInfo(value: string | number | undefined): DrugDoseInfo {
  const text = normalizeValue(value).toLowerCase().replace(/,/g, "");
  const totalMassesMg: number[] = [];
  const concentrationsMgPerMl: number[] = [];
  const massPerVolumePattern = /(\d+(?:\.\d+)?)\s*(mcg|mg|g)\s*\/\s*(?:(\d+(?:\.\d+)?)\s*)?ml/g;
  const massPattern = /(\d+(?:\.\d+)?)\s*(mcg|mg|g)\b/g;

  for (const match of text.matchAll(massPerVolumePattern)) {
    const massMg = toMilligrams(Number(match[1]), match[2]);
    const volumeMl = match[3] ? Number(match[3]) : 1;
    if (Number.isFinite(massMg) && Number.isFinite(volumeMl) && volumeMl > 0) {
      totalMassesMg.push(massMg);
      concentrationsMgPerMl.push(massMg / volumeMl);
    }
  }

  for (const match of text.matchAll(massPattern)) {
    const massMg = toMilligrams(Number(match[1]), match[2]);
    if (Number.isFinite(massMg)) totalMassesMg.push(massMg);
  }

  return {
    totalMassesMg: uniqueNumbers(totalMassesMg),
    concentrationsMgPerMl: uniqueNumbers(concentrationsMgPerMl),
  };
}

function hasMatchingNumber(left: number[], right: number[]) {
  return left.some((leftValue) => right.some((rightValue) => Math.abs(leftValue - rightValue) < 0.000001));
}

function drugDoseMatches(rowName: string | number | undefined, masterName: string | number | undefined) {
  const rowDose = parseDrugDoseInfo(rowName);
  const masterDose = parseDrugDoseInfo(masterName);
  if (rowDose.concentrationsMgPerMl.length > 0 && masterDose.concentrationsMgPerMl.length > 0) {
    return hasMatchingNumber(rowDose.concentrationsMgPerMl, masterDose.concentrationsMgPerMl);
  }
  return hasMatchingNumber(rowDose.totalMassesMg, masterDose.totalMassesMg);
}

function meaningfulDrugNameTokens(value: string | number | undefined) {
  return drugMatchTokens(value).filter(
    (token) => !nonDrugNameTokens.has(token) && !/^\d/.test(token) && !token.includes("%"),
  );
}

function drugMeaningfulPrefixMatches(rowName: string | number | undefined, masterName: string | number | undefined) {
  const rowTokens = meaningfulDrugNameTokens(rowName);
  const masterTokens = meaningfulDrugNameTokens(masterName);
  return rowTokens.length > 0 && masterTokens.length > 0 && rowTokens[0] === masterTokens[0];
}

function drugNamesStrictMatch(rowName: string | number | undefined, masterName: string | number | undefined) {
  const rowText = normalizeDrugMatchText(rowName);
  const masterText = normalizeDrugMatchText(masterName);
  if (!rowText || !masterText) return false;
  if (rowText.includes(masterText) || masterText.includes(rowText)) return true;

  const rowTokens = drugMatchTokens(rowName);
  const masterTokens = drugMatchTokens(masterName);
  return masterTokens.length >= 2 && masterTokens.every((token) => rowTokens.includes(token));
}

function drugNamesMatch(rowName: string | number | undefined, masterName: string | number | undefined) {
  if (drugNamesStrictMatch(rowName, masterName)) return true;
  return drugMeaningfulPrefixMatches(rowName, masterName) && drugDoseMatches(rowName, masterName);
}

function normalizeStorage(value: string | number | undefined) {
  return normalizeValue(value).replace(/\s+/g, "").toUpperCase();
}

const roomSpecificStorageAliases = new Map([
  ["GICLA", ["소화기병검사실", "소화기병 검사실", "소화기검사실", "소화기 검사실"]],
]);

function storageMatchesRoom(storage: string, roomId: string) {
  return storage.includes(roomId) || (roomSpecificStorageAliases.get(roomId) ?? []).some((alias) => storage.includes(normalizeStorage(alias)));
}

function uniqueLots(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseExpiryTime(value: string | number | undefined) {
  if (typeof value === "number") {
    return Date.UTC(1899, 11, 30) + value * 24 * 60 * 60 * 1000;
  }
  const text = normalizeValue(value);
  if (!text) return 0;
  if (/^\d+(\.\d+)?$/.test(text)) {
    return Date.UTC(1899, 11, 30) + Number(text) * 24 * 60 * 60 * 1000;
  }
  const normalized = text.replace(/[.년월]/g, "-").replace(/일/g, "").replace(/\s+/g, "");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function appendLot(map: Map<string, string[]>, key: string, lot: string) {
  const current = map.get(key) ?? [];
  current.push(lot);
  map.set(key, current);
}

function appendCandidate(map: Map<string, LotCandidate[]>, key: string, candidate: LotCandidate) {
  const current = map.get(key) ?? [];
  current.push(candidate);
  map.set(key, current);
}

function lotsFor(map: Map<string, string[]>, code: string) {
  return uniqueLots([...(map.get(code) ?? []), ...(map.get("*") ?? [])]).join(", ");
}

function latestLotFor(map: Map<string, LotCandidate[]>, code: string) {
  const candidates = [...(map.get(code) ?? []), ...(map.get("*") ?? [])];
  if (candidates.length === 0) return "";
  return candidates.reduce((latest, candidate) => (candidate.expiryTime > latest.expiryTime ? candidate : latest)).lot;
}

export function buildNarcoticLotAssignments(input: BuildNarcoticLotAssignmentsInput) {
  const roomSpecificLots = new Map<string, string[]>();
  const otherStorageLots = new Map<string, string[]>();
  const pharmacyLots = new Map<string, LotCandidate[]>();
  const roomSpecificStorageIds = ["AN", "HPC", "GICLA", "DREMM", "HBEF"];
  const knownDrugCodes = new Set(input.drugCodes.map(normalizeDrugCode));
  const drugSources: NonNullable<BuildNarcoticLotAssignmentsInput["drugs"]> = input.drugs ?? input.drugCodes.map((code) => ({ code }));
  const drugMatchers = drugSources.map((drug) => ({
    code: normalizeDrugCode(drug.code),
    names: [drug.code, drug.genericName, drug.productName, drug.name].map(normalizeValue).filter(Boolean),
  }));
  const conversionMatchers = (input.drugNameCodeMap ?? (narcoticDrugCodeMapRows as NarcoticDrugNameCodeMapEntry[]))
    .map((row) => ({
      code: normalizeDrugCode(row.drugCode),
      name: normalizeValue(row.drugName),
    }))
    .filter((row) => row.code && row.name);

  function resolveDrugCodes(row: NarcoticLotSourceRow) {
    const rawCode = normalizeDrugCode(row.drugCode);
    if (rawCode && knownDrugCodes.has(rawCode)) return [rawCode];

    const rawCodeAlias = narcoticUploadCodeAliases.get(rawCode);
    if (rawCodeAlias && knownDrugCodes.has(rawCodeAlias)) return [rawCodeAlias];

    const rawCodeConversionMatches = rawCode ? conversionMatchers.filter((conversion) => conversion.code === rawCode) : [];
    if (rawCodeConversionMatches.length > 0) {
      const strictAliasCodes = drugMatchers
        .filter((drug) =>
          rawCodeConversionMatches.some((conversion) =>
            drug.names.some((name) => drugNamesStrictMatch(conversion.name, name)),
          ),
        )
        .map((drug) => drug.code);
      if (strictAliasCodes.length > 0) return [...new Set(strictAliasCodes)];
    }

    const rowName = normalizeValue(row.drugName);
    if (!rowName) {
      const aliasCodes = drugMatchers
        .filter((drug) =>
          rawCodeConversionMatches.some((conversion) =>
            drug.names.some((name) => drugNamesMatch(conversion.name, name)),
          ),
        )
        .map((drug) => drug.code);
      return [...new Set(aliasCodes)];
    }

    const strictConversionMatches = conversionMatchers.filter(
      (conversion) => drugNamesStrictMatch(rowName, conversion.name) || Boolean(rawCode && conversion.code === rawCode),
    );
    const directCodes = strictConversionMatches.map((conversion) => conversion.code).filter((code) => knownDrugCodes.has(code));
    if (directCodes.length > 0) return [...new Set(directCodes)];

    const strictConversionAliasCodes = drugMatchers
      .filter((drug) =>
        strictConversionMatches.some((conversion) =>
          drug.names.some((name) => drugNamesStrictMatch(conversion.name, name)),
        ),
      )
      .map((drug) => drug.code);
    if (strictConversionAliasCodes.length > 0) return [...new Set(strictConversionAliasCodes)];

    const strictDrugCodes = drugMatchers
      .filter((drug) => drug.names.some((name) => drugNamesStrictMatch(rowName, name)))
      .map((drug) => drug.code);
    if (strictDrugCodes.length > 0) return [...new Set(strictDrugCodes)];

    const conversionMatches = conversionMatchers.filter(
      (conversion) => drugNamesMatch(rowName, conversion.name) || Boolean(rawCode && conversion.code === rawCode),
    );
    const looseDirectCodes = conversionMatches.map((conversion) => conversion.code).filter((code) => knownDrugCodes.has(code));
    if (looseDirectCodes.length > 0) return [...new Set(looseDirectCodes)];

    const matches = drugMatchers
      .filter(
        (drug) =>
          drug.names.some((name) => drugNamesMatch(rowName, name)) ||
          conversionMatches.some((conversion) => drug.names.some((name) => drugNamesMatch(conversion.name, name))),
      )
      .map((drug) => drug.code);
    return [...new Set(matches)];
  }

  for (const row of input.rows) {
    const storage = normalizeStorage(row.storage);
    const lot = normalizeValue(row.lot);
    if (!storage || !lot) continue;

    const codes = resolveDrugCodes(row);
    if (codes.length === 0) continue;

    for (const code of codes) {
      for (const roomId of roomSpecificStorageIds) {
        if (storageMatchesRoom(storage, roomId)) appendLot(roomSpecificLots, narcoticLotKey(roomId, code), lot);
      }
      if (storage.includes("기타병동") || storage.includes("기타보관소") || storage.includes("약무정보")) appendLot(otherStorageLots, code, lot);
      if (storage.includes("조제실")) {
        appendCandidate(pharmacyLots, code, {
          lot,
          expiryTime: parseExpiryTime(row.expiryDate),
        });
      }
    }
  }

  const excludedOtherRooms = new Set(["AN", "HPC", "GICLA", "DREMM", "HBEF"]);
  const assignments: Record<string, NarcoticLotValue> = {};
  for (const roomId of input.roomIds) {
    for (const rawDrugCode of input.drugCodes) {
      const drugCode = normalizeDrugCode(rawDrugCode);
      const roomStorage = normalizeStorage(roomId);
      let roomLot = "";
      const roomSpecificLot = lotsFor(roomSpecificLots, narcoticLotKey(roomStorage, drugCode));
      if (roomSpecificLot) {
        roomLot = roomSpecificLot;
      } else if (!excludedOtherRooms.has(roomStorage)) {
        roomLot = lotsFor(otherStorageLots, drugCode);
      }

      assignments[narcoticLotKey(roomId, rawDrugCode)] = {
        roomLot,
        pharmacyLot: latestLotFor(pharmacyLots, drugCode),
      };
    }
  }

  return assignments;
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function cellColumnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  return [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(xml = "") {
  return (xml.match(/<si[\s\S]*?<\/si>/g) ?? []).map((entry) =>
    decodeXml(
      [...entry.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((match) => match[1])
        .join(""),
    ),
  );
}

type SheetCellValue = string | number;

function parseWorksheet(xml: string, sharedStrings: string[]) {
  return (xml.match(/<row\b[\s\S]*?<\/row>/g) ?? []).map((rowXml) => {
    const row: SheetCellValue[] = [];
    for (const match of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = match[1];
      const body = match[2];
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? "";
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "";
      const value = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      const columnIndex = cellColumnIndex(ref);
      row[columnIndex] = type === "s" ? (sharedStrings[Number(value)] ?? "") : decodeXml(value);
    }
    return row;
  });
}

function compactHeader(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function findHeaderIndex(headers: string[], patterns: RegExp[]) {
  return headers.findIndex((header) => patterns.some((pattern) => pattern.test(compactHeader(header))));
}

function parseNarcoticLotRows(rows: SheetCellValue[][]): NarcoticLotSourceRow[] {
  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeValue);
    return findHeaderIndex(headers, [/보관소/, /저장소/]) >= 0 && findHeaderIndex(headers, [/lot/, /로트/, /제조번호/]) >= 0;
  });
  if (headerRowIndex < 0) return [];

  const headers = rows[headerRowIndex].map(normalizeValue);
  const storageIndex = findHeaderIndex(headers, [/보관소/, /저장소/]);
  const lotIndex = findHeaderIndex(headers, [/lot/, /로트/, /제조번호/]);
  const expiryIndex = findHeaderIndex(headers, [/유효/, /사용기한/, /exp/]);
  const codeIndex = findHeaderIndex(headers, [/약품코드/, /품목코드/, /표준코드/, /^코드$/]);
  const nameIndex = findHeaderIndex(headers, [/명칭/, /약품명/, /품명/]);

  return rows.slice(headerRowIndex + 1).flatMap((row) => {
    const storage = normalizeValue(row[storageIndex]);
    const lot = normalizeValue(row[lotIndex]);
    if (!storage || !lot) return [];
    return [
      {
        storage,
        lot,
        expiryDate: expiryIndex >= 0 ? row[expiryIndex] : undefined,
        drugCode: codeIndex >= 0 ? row[codeIndex] : undefined,
        drugName: nameIndex >= 0 ? normalizeValue(row[nameIndex]) : undefined,
      },
    ];
  });
}

async function inflateZipEntry(method: number, bytes: Uint8Array) {
  if (method === 0) return bytes;
  if (method !== 8 || typeof DecompressionStream === "undefined") {
    throw new Error("지원하지 않는 Excel 압축 형식입니다.");
  }
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate-raw" as never));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipXlsxTextEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let eocdOffset = -1;
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 66000); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("Excel 파일 구조를 읽을 수 없습니다.");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries: Record<string, string> = {};

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = decoder.decode(new Uint8Array(buffer, offset + 46, fileNameLength));

    if (fileName === "xl/sharedStrings.xml" || /^xl\/worksheets\/sheet\d+\.xml$/.test(fileName)) {
      const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = new Uint8Array(buffer, dataStart, compressedSize);
      entries[fileName] = decoder.decode(await inflateZipEntry(method, compressed));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function isOleCompoundDocument(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength));
  return bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

const OLE_FREE_SECTOR = 0xffffffff;
const OLE_END_OF_CHAIN = 0xfffffffe;

function sectorOffset(sectorId: number, sectorSize: number) {
  return (sectorId + 1) * sectorSize;
}

function concatenateUint8(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function readOleWorkbookStream(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const sectorSize = 1 << view.getUint16(0x1e, true);
  const miniStreamCutoff = view.getUint32(0x38, true);
  const firstDirectorySector = view.getUint32(0x30, true);
  const fatSectorCount = view.getUint32(0x2c, true);
  const firstDifatSector = view.getUint32(0x44, true);
  const difatSectorCount = view.getUint32(0x48, true);
  const difat: number[] = [];

  for (let index = 0; index < 109; index += 1) {
    const sectorId = view.getUint32(0x4c + index * 4, true);
    if (sectorId !== OLE_FREE_SECTOR) difat.push(sectorId);
  }

  let difatSector = firstDifatSector;
  for (let sectorIndex = 0; sectorIndex < difatSectorCount && difatSector !== OLE_END_OF_CHAIN; sectorIndex += 1) {
    const offset = sectorOffset(difatSector, sectorSize);
    const entriesPerSector = sectorSize / 4 - 1;
    for (let index = 0; index < entriesPerSector; index += 1) {
      const sectorId = view.getUint32(offset + index * 4, true);
      if (sectorId !== OLE_FREE_SECTOR) difat.push(sectorId);
    }
    difatSector = view.getUint32(offset + entriesPerSector * 4, true);
  }

  const fat: number[] = [];
  for (const fatSector of difat.slice(0, fatSectorCount)) {
    const offset = sectorOffset(fatSector, sectorSize);
    for (let index = 0; index < sectorSize / 4; index += 1) {
      fat.push(view.getUint32(offset + index * 4, true));
    }
  }

  function readSectorChain(startSector: number, size?: number) {
    const parts: Uint8Array[] = [];
    let sector = startSector;
    const seen = new Set<number>();

    while (sector !== OLE_END_OF_CHAIN && sector !== OLE_FREE_SECTOR && sector < fat.length && !seen.has(sector)) {
      seen.add(sector);
      const offset = sectorOffset(sector, sectorSize);
      parts.push(new Uint8Array(buffer, offset, Math.min(sectorSize, buffer.byteLength - offset)));
      sector = fat[sector];
    }

    const bytes = concatenateUint8(parts);
    return size === undefined ? bytes : bytes.slice(0, size);
  }

  const directory = readSectorChain(firstDirectorySector);
  const decoder = new TextDecoder("utf-16le");

  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const entry = directory.slice(offset, offset + 128);
    const entryView = new DataView(entry.buffer, entry.byteOffset, entry.byteLength);
    const nameLength = entryView.getUint16(64, true);
    if (nameLength < 2) continue;
    const name = decoder.decode(entry.slice(0, nameLength - 2));
    if (name !== "Workbook" && name !== "Book") continue;

    const startSector = entryView.getUint32(116, true);
    const streamSize = entryView.getUint32(120, true);
    if (streamSize < miniStreamCutoff) {
      throw new Error("작은 OLE 스트림 Excel 파일은 아직 지원하지 않습니다.");
    }
    return readSectorChain(startSector, streamSize);
  }

  throw new Error("Excel Workbook 스트림을 찾을 수 없습니다.");
}

type BiffRecord = {
  id: number;
  data: Uint8Array<ArrayBufferLike>;
};

function parseBiffRecords(workbook: Uint8Array<ArrayBufferLike>): BiffRecord[] {
  const records: BiffRecord[] = [];
  const view = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  let offset = 0;

  while (offset + 4 <= workbook.length) {
    const id = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    offset += 4;
    if (offset + length > workbook.length) break;
    records.push({ id, data: workbook.slice(offset, offset + length) });
    offset += length;
  }

  return records;
}

class BiffStringReader {
  private segmentIndex = 0;
  private offset = 0;

  constructor(private readonly segments: Uint8Array<ArrayBufferLike>[]) {}

  remainingInSegment() {
    return this.segments[this.segmentIndex].length - this.offset;
  }

  moveToNextSegment() {
    this.segmentIndex += 1;
    this.offset = 0;
    if (this.segmentIndex >= this.segments.length) {
      throw new Error("Excel 문자열 테이블이 중간에 끝났습니다.");
    }
  }

  readByte() {
    if (this.remainingInSegment() <= 0) this.moveToNextSegment();
    const value = this.segments[this.segmentIndex][this.offset];
    this.offset += 1;
    return value;
  }

  readBytes(length: number) {
    const output = new Uint8Array(length);
    let written = 0;
    while (written < length) {
      if (this.remainingInSegment() <= 0) this.moveToNextSegment();
      const count = Math.min(length - written, this.remainingInSegment());
      output.set(this.segments[this.segmentIndex].slice(this.offset, this.offset + count), written);
      this.offset += count;
      written += count;
    }
    return output;
  }

  readUint16() {
    const bytes = this.readBytes(2);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(0, true);
  }

  readUint32() {
    const bytes = this.readBytes(4);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  }
}

function decodeCompressedBiffText(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

function readBiffString(reader: BiffStringReader) {
  const characterCount = reader.readUint16();
  let flags = reader.readByte();
  let isWide = Boolean(flags & 0x01);
  const hasExtended = Boolean(flags & 0x04);
  const hasRichText = Boolean(flags & 0x08);
  const richTextRuns = hasRichText ? reader.readUint16() : 0;
  const extendedSize = hasExtended ? reader.readUint32() : 0;
  const parts: string[] = [];
  let remaining = characterCount;

  while (remaining > 0) {
    const width = isWide ? 2 : 1;
    if (reader.remainingInSegment() <= 0) {
      reader.moveToNextSegment();
      flags = reader.readByte();
      isWide = Boolean(flags & 0x01);
    }
    const count = Math.min(remaining, Math.floor(reader.remainingInSegment() / width));
    if (count <= 0) continue;
    const bytes = reader.readBytes(count * width);
    parts.push(isWide ? new TextDecoder("utf-16le").decode(bytes) : decodeCompressedBiffText(bytes));
    remaining -= count;
  }

  if (richTextRuns > 0) reader.readBytes(richTextRuns * 4);
  if (extendedSize > 0) reader.readBytes(extendedSize);
  return parts.join("");
}

function parseBiffSharedStrings(records: BiffRecord[]) {
  const sstIndex = records.findIndex((record) => record.id === 0x00fc);
  if (sstIndex < 0) return [];

  const sstRecord = records[sstIndex].data;
  const sstView = new DataView(sstRecord.buffer, sstRecord.byteOffset, sstRecord.byteLength);
  const uniqueCount = sstView.getUint32(4, true);
  const segments: Uint8Array<ArrayBufferLike>[] = [sstRecord.slice(8)];
  let index = sstIndex + 1;
  while (index < records.length && records[index].id === 0x003c) {
    segments.push(records[index].data);
    index += 1;
  }

  const reader = new BiffStringReader(segments);
  const strings: string[] = [];
  for (let stringIndex = 0; stringIndex < uniqueCount; stringIndex += 1) {
    strings.push(readBiffString(reader));
  }
  return strings;
}

function decodeRkNumber(rk: number) {
  let value: number;
  if (rk & 0x02) {
    value = rk >> 2;
  } else {
    const bytes = new ArrayBuffer(8);
    const view = new DataView(bytes);
    view.setUint32(4, rk & 0xfffffffc, true);
    value = view.getFloat64(0, true);
  }
  return rk & 0x01 ? value / 100 : value;
}

function setSheetCell(rows: Map<number, Map<number, SheetCellValue>>, row: number, column: number, value: SheetCellValue) {
  const cells = rows.get(row) ?? new Map<number, SheetCellValue>();
  cells.set(column, value);
  rows.set(row, cells);
}

function rowsMapToArray(rows: Map<number, Map<number, SheetCellValue>>) {
  const output: SheetCellValue[][] = [];
  for (const [rowIndex, cells] of rows.entries()) {
    const row: SheetCellValue[] = [];
    for (const [columnIndex, value] of cells.entries()) {
      row[columnIndex] = value;
    }
    output[rowIndex] = row;
  }
  return output.filter(Boolean);
}

function parseBiffWorkbookSheets(workbook: Uint8Array<ArrayBufferLike>) {
  const records = parseBiffRecords(workbook);
  const sharedStrings = parseBiffSharedStrings(records);
  const sheets: SheetCellValue[][][] = [];
  let currentRows: Map<number, Map<number, SheetCellValue>> | null = null;

  for (const record of records) {
    const view = new DataView(record.data.buffer, record.data.byteOffset, record.data.byteLength);

    if (record.id === 0x0809 && record.data.length >= 4 && view.getUint16(2, true) === 0x0010) {
      currentRows = new Map();
      continue;
    }
    if (record.id === 0x000a && currentRows) {
      sheets.push(rowsMapToArray(currentRows));
      currentRows = null;
      continue;
    }
    if (!currentRows) continue;

    if (record.id === 0x00fd && record.data.length >= 10) {
      const row = view.getUint16(0, true);
      const column = view.getUint16(2, true);
      const stringIndex = view.getUint32(6, true);
      setSheetCell(currentRows, row, column, sharedStrings[stringIndex] ?? "");
    } else if (record.id === 0x0203 && record.data.length >= 14) {
      setSheetCell(currentRows, view.getUint16(0, true), view.getUint16(2, true), view.getFloat64(6, true));
    } else if (record.id === 0x027e && record.data.length >= 10) {
      setSheetCell(currentRows, view.getUint16(0, true), view.getUint16(2, true), decodeRkNumber(view.getUint32(6, true)));
    } else if (record.id === 0x00bd && record.data.length >= 8) {
      const row = view.getUint16(0, true);
      const firstColumn = view.getUint16(2, true);
      const lastColumn = view.getUint16(record.data.length - 2, true);
      let offset = 4;
      for (let column = firstColumn; column <= lastColumn && offset + 6 <= record.data.length - 2; column += 1) {
        setSheetCell(currentRows, row, column, decodeRkNumber(view.getUint32(offset + 2, true)));
        offset += 6;
      }
    } else if (record.id === 0x0204 && record.data.length >= 8) {
      const row = view.getUint16(0, true);
      const column = view.getUint16(2, true);
      const length = view.getUint16(6, true);
      const flags = record.data[8] ?? 0;
      const raw = record.data.slice(9, 9 + length * (flags & 0x01 ? 2 : 1));
      setSheetCell(currentRows, row, column, flags & 0x01 ? new TextDecoder("utf-16le").decode(raw) : decodeCompressedBiffText(raw));
    }
  }

  return sheets;
}

function decodeTextWorkbook(buffer: ArrayBuffer) {
  const utf16Text = new TextDecoder("utf-16le").decode(buffer);
  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  return utf16Text.includes("보관소") || utf16Text.includes("<table") ? utf16Text : utf8Text;
}

function stripHtml(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseTextWorkbookRows(buffer: ArrayBuffer): SheetCellValue[][] {
  const text = decodeTextWorkbook(buffer);
  const tableRows = text.match(/<tr\b[\s\S]*?<\/tr>/gi);
  if (tableRows) {
    return tableRows.map((row) =>
      (row.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) ?? []).map((cell) => stripHtml(cell)),
    );
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.split(line.includes("\t") ? "\t" : ",").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

export async function readNarcoticLotWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  if (isOleCompoundDocument(buffer)) {
    const workbook = readOleWorkbookStream(buffer);
    for (const sheetRows of parseBiffWorkbookSheets(workbook)) {
      const rows = parseNarcoticLotRows(sheetRows);
      if (rows.length > 0) return rows;
    }
    return [];
  }

  if (decodeTextWorkbook(buffer).includes("보관소") && !new Uint8Array(buffer).slice(0, 4).every((byte, index) => byte === [0x50, 0x4b, 0x03, 0x04][index])) {
    return parseNarcoticLotRows(parseTextWorkbookRows(buffer));
  }

  const entries = await unzipXlsxTextEntries(buffer);
  const sharedStrings = parseSharedStrings(entries["xl/sharedStrings.xml"]);
  const sheetName = Object.keys(entries)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort()[0];
  if (!sheetName) return [];
  return parseNarcoticLotRows(parseWorksheet(entries[sheetName], sharedStrings));
}
