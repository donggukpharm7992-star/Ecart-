# Pharmacy Label Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved pharmacy label workspace with Excel matching data, editable label defaults, clean printable label previews, and batch printing.

**Architecture:** Keep Excel import, label matching, saved-label precedence, and React layout in separate modules. `App.tsx` should only open the separate workspace and pass data/callbacks; label draft resolution and local-storage persistence live in small tested modules. The first pass stores edited labels in browser local storage behind a repository API.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Python `openpyxl`, generated JSON data, browser localStorage.

---

## File Structure

- Create `scripts/extract_pharmacy_label_matches.py`: reads `원내보유의약품_라벨매칭_20260702.xlsx` and generates normalized matching rows.
- Create `src/data/pharmacyLabelMatches.generated.json`: generated matching data consumed by the UI.
- Create `src/pharmacyLabelMatches.ts`: typed loader and pure matching helpers.
- Create `src/pharmacyLabelMatches.test.ts`: tests matching status, candidates, and search.
- Create `src/pharmacyLabelStudio.ts`: pure label draft, saved label, size/style, print grouping, and repository helpers.
- Create `src/pharmacyLabelStudio.test.ts`: tests saved-label precedence, default matched label creation, custom size persistence, and A4/A3 grouping.
- Create `src/PharmacyLabelStudio.tsx`: React workspace with the approved three-column layout.
- Modify `src/App.tsx`: open/close the separate pharmacy label workspace and hide the stock master while it is open.
- Modify `src/styles.css`: add the approved hospital UI layout and clean printable label styles.
- Modify `docs/SYSTEM_MAPPING.md`: document the new matching workbook and generated JSON.
- Modify `package.json`: add `generate:label-matches`.

---

### Task 1: Generate Pharmacy Label Match Data

**Files:**
- Create: `scripts/extract_pharmacy_label_matches.py`
- Create: `src/data/pharmacyLabelMatches.generated.json`
- Modify: `package.json`
- Modify: `docs/SYSTEM_MAPPING.md`

- [ ] **Step 1: Add a failing import test**

Create `src/pharmacyLabelMatches.test.ts` with this initial test:

```ts
import { describe, expect, it } from "vitest";
import { loadPharmacyLabelMatchRows, splitMatchedLabelCandidates } from "./pharmacyLabelMatches";

describe("pharmacy label match source", () => {
  it("loads label matching rows generated from the matching workbook", async () => {
    const rows = await loadPharmacyLabelMatchRows();
    const atropine = rows.find((row) => row.code === "A.01W-T");

    expect(rows.length).toBeGreaterThan(700);
    expect(atropine?.matchStatus).toBe("확정");
    expect(atropine?.matchedLabel).toContain("Atropine");
    expect(atropine?.sourceFile).toContain("xlsx");
  });

  it("splits multiple workbook candidates without exposing empty entries", () => {
    expect(splitMatchedLabelCandidates("A---B\\n---\\nC")).toEqual(["A", "B", "C"]);
    expect(splitMatchedLabelCandidates("")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pharmacyLabelMatches.test.ts`

Expected: FAIL because `src/pharmacyLabelMatches.ts` does not exist.

- [ ] **Step 3: Add the TypeScript loader**

Create `src/pharmacyLabelMatches.ts`:

```ts
import rawRows from "./data/pharmacyLabelMatches.generated.json";

export type PharmacyLabelMatchStatus = "확정" | "검토필요" | "미매칭" | string;

export type PharmacyLabelMatchRow = {
  code: string;
  englishName: string;
  koreanName: string;
  strength: string;
  spec: string;
  package: string;
  storage: string;
  lightProtected: boolean;
  refrigerated: boolean;
  doseCaution: boolean;
  similarSound: boolean;
  similarLook: boolean;
  highRisk: boolean;
  highCaution: boolean;
  anticancer: boolean;
  narcotic: boolean;
  psychotropic: boolean;
  highCost: boolean;
  nameCaution: boolean;
  matchedLabel: string;
  sourceFile: string;
  sourceLocation: string;
  matchStatus: PharmacyLabelMatchStatus;
  matchScore: number;
  matchReason: string;
  conditionSource: string;
  reviewMemo: string;
};

export function splitMatchedLabelCandidates(value: string) {
  return value
    .split(/\\n?---\\n?/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function loadPharmacyLabelMatchRows() {
  return Promise.resolve(rawRows as PharmacyLabelMatchRow[]);
}

export function matchesPharmacyLabelMatch(row: PharmacyLabelMatchRow, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  const compact = value.replace(/\\s+/g, "");
  const text = [
    row.code,
    row.englishName,
    row.koreanName,
    row.strength,
    row.spec,
    row.package,
    row.storage,
    row.matchedLabel,
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(value) || text.replace(/\\s+/g, "").includes(compact);
}
```

- [ ] **Step 4: Add the Python generator**

Create `scripts/extract_pharmacy_label_matches.py`:

```python
from __future__ import annotations

import json
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "원내보유의약품_라벨매칭_20260702.xlsx"
OUTPUT = ROOT / "src" / "data" / "pharmacyLabelMatches.generated.json"

FIELDS = {
    "약품코드": "code",
    "상용약품명": "englishName",
    "한글약품명": "koreanName",
    "함량": "strength",
    "규격": "spec",
    "포장": "package",
    "보관법": "storage",
    "해당라벨": "matchedLabel",
    "라벨원본파일": "sourceFile",
    "라벨시트/문서위치": "sourceLocation",
    "매칭상태": "matchStatus",
    "매칭근거": "matchReason",
    "조건출처": "conditionSource",
    "확인메모": "reviewMemo",
}

BOOL_FIELDS = {
    "차광": "lightProtected",
    "냉장": "refrigerated",
    "용량주의": "doseCaution",
    "유사발음": "similarSound",
    "유사모양": "similarLook",
    "고위험의약품": "highRisk",
    "고주의약품": "highCaution",
    "항암제": "anticancer",
    "마약": "narcotic",
    "향정": "psychotropic",
    "고가통계약": "highCost",
    "이름주의": "nameCaution",
}


def clean(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("_x000D_", "").strip()


def is_checked(value: object) -> bool:
    text = clean(value).upper()
    return text in {"Y", "YES", "TRUE", "1", "O", "○", "예", "해당", "차광", "냉장"}


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source workbook: {SOURCE}")

    workbook = load_workbook(SOURCE, data_only=True, read_only=True)
    worksheet = workbook["라벨매칭"]
    headers = [clean(value).replace("\n", " ") for value in next(worksheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    index = {header: position for position, header in enumerate(headers)}

    rows: list[dict[str, object]] = []
    for raw in worksheet.iter_rows(min_row=2, values_only=True):
        code = clean(raw[index["약품코드"]])
        if not code:
            continue

        row: dict[str, object] = {}
        for header, key in FIELDS.items():
            row[key] = clean(raw[index[header]]) if header in index else ""
        for header, key in BOOL_FIELDS.items():
            row[key] = is_checked(raw[index[header]]) if header in index else False
        score_text = clean(raw[index["매칭점수"]]) if "매칭점수" in index else "0"
        row["matchScore"] = int(float(score_text)) if score_text else 0
        rows.append(row)

    rows.sort(key=lambda item: (str(item["englishName"]).lower(), str(item["code"]).lower()))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} pharmacy label match rows to {OUTPUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Add the npm script and generate data**

Modify `package.json` scripts:

```json
"generate:label-matches": "py scripts/extract_pharmacy_label_matches.py"
```

Run: `npm run generate:label-matches`

Expected: prints `Wrote 1662 pharmacy label match rows`.

- [ ] **Step 6: Run tests**

Run: `npm test -- src/pharmacyLabelMatches.test.ts`

Expected: PASS.

- [ ] **Step 7: Update docs**

Add this data source to `docs/SYSTEM_MAPPING.md`:

```md
- `원내보유의약품_라벨매칭_20260702.xlsx`
  - Source for pharmacy label matching and label source metadata.
  - `라벨매칭` rows are generated into `src/data/pharmacyLabelMatches.generated.json`.
  - Match details are keyed by `약품코드`; score and original location stay in the label workspace detail panel.
```

Add this update rule:

```md
When `원내보유의약품_라벨매칭_20260702.xlsx` changes, run `npm run generate:label-matches`.
```

---

### Task 2: Add Label Draft And Saved-Label Logic

**Files:**
- Create: `src/pharmacyLabelStudio.ts`
- Create: `src/pharmacyLabelStudio.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/pharmacyLabelStudio.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  A4_PAPER,
  A3_PAPER,
  DEFAULT_PHARMACY_LABEL_STYLE,
  createEmptyPharmacyLabelDraft,
  createMatchedPharmacyLabelDraft,
  groupPharmacyLabelsForPaper,
  resolvePharmacyLabelDraft,
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

describe("pharmacy label studio", () => {
  it("creates matched drafts with the default size and no empty footer", () => {
    const draft = createMatchedPharmacyLabelDraft(row);

    expect(draft.code).toBe("A.01W-T");
    expect(draft.size).toEqual({ presetKey: "35x100", widthMm: 100, heightMm: 35 });
    expect(draft.printable.footer.enabled).toBe(false);
    expect(draft.printable.title).toContain("Atropine");
    expect(draft.style).toEqual(DEFAULT_PHARMACY_LABEL_STYLE);
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

    expect(groupPharmacyLabelsForPaper(labels, A4_PAPER).length).toBeGreaterThan(1);
    expect(groupPharmacyLabelsForPaper(labels, A3_PAPER).length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pharmacyLabelStudio.test.ts`

Expected: FAIL because `src/pharmacyLabelStudio.ts` does not exist.

- [ ] **Step 3: Implement pure label logic**

Create `src/pharmacyLabelStudio.ts`:

```ts
import { splitMatchedLabelCandidates, type PharmacyLabelMatchRow } from "./pharmacyLabelMatches";

export type PharmacyLabelType = "drug-name";
export type PharmacyLabelSourceType = "matched-workbook" | "manual" | "new";
export type PharmacyLabelPaper = { key: "A4" | "A3"; widthMm: number; heightMm: number; marginMm: number };
export type PharmacyLabelSize = { presetKey: "10x70" | "15x95" | "35x100" | "55x95" | "custom"; widthMm: number; heightMm: number };

export type PharmacyLabelStyle = {
  outerBorderPx: number;
  outerBorderColor: string;
  textOutlinePx: number;
  textOutlineColor: string;
  fontFamily: string;
  fontSizePt: number;
  fontColor: string;
  warningColor: string;
};

export type PharmacyPrintableText = {
  title: string;
  warning: string;
  footer: { enabled: boolean; text: string };
};

export type PharmacyLabelDraft = {
  id: string;
  code: string;
  labelType: PharmacyLabelType;
  size: PharmacyLabelSize;
  printable: PharmacyPrintableText;
  style: PharmacyLabelStyle;
  sourceType: PharmacyLabelSourceType;
  sourceFile?: string;
  sourceLocation?: string;
  savedAt?: string;
};

export type PharmacySavedLabel = PharmacyLabelDraft & {
  savedAt: string;
};

export const DEFAULT_PHARMACY_LABEL_SIZE: PharmacyLabelSize = { presetKey: "35x100", widthMm: 100, heightMm: 35 };
export const A4_PAPER: PharmacyLabelPaper = { key: "A4", widthMm: 210, heightMm: 297, marginMm: 10 };
export const A3_PAPER: PharmacyLabelPaper = { key: "A3", widthMm: 297, heightMm: 420, marginMm: 10 };

export const DEFAULT_PHARMACY_LABEL_STYLE: PharmacyLabelStyle = {
  outerBorderPx: 3,
  outerBorderColor: "#111827",
  textOutlinePx: 0,
  textOutlineColor: "#ffffff",
  fontFamily: "Malgun Gothic, Segoe UI, sans-serif",
  fontSizePt: 25,
  fontColor: "#111827",
  warningColor: "#d92d20",
};

export function createMatchedPharmacyLabelDraft(row: PharmacyLabelMatchRow): PharmacyLabelDraft {
  const candidate = splitMatchedLabelCandidates(row.matchedLabel)[0];
  return {
    id: `pharmacy-label-${row.code}`,
    code: row.code,
    labelType: "drug-name",
    size: DEFAULT_PHARMACY_LABEL_SIZE,
    printable: {
      title: candidate || row.englishName || row.koreanName,
      warning: row.lightProtected ? "차광\\n필요" : row.refrigerated ? "냉장" : "",
      footer: { enabled: false, text: "" },
    },
    style: DEFAULT_PHARMACY_LABEL_STYLE,
    sourceType: "matched-workbook",
    sourceFile: row.sourceFile,
    sourceLocation: row.sourceLocation,
  };
}

export function createEmptyPharmacyLabelDraft(code: string, name: string): PharmacyLabelDraft {
  return {
    id: `pharmacy-label-${code}`,
    code,
    labelType: "drug-name",
    size: DEFAULT_PHARMACY_LABEL_SIZE,
    printable: { title: name, warning: "", footer: { enabled: false, text: "" } },
    style: DEFAULT_PHARMACY_LABEL_STYLE,
    sourceType: "new",
  };
}

export function resolvePharmacyLabelDraft(row: PharmacyLabelMatchRow, savedLabels: PharmacySavedLabel[]) {
  const saved = [...savedLabels].filter((label) => label.code === row.code).sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
  return saved ?? createMatchedPharmacyLabelDraft(row);
}

export function savePharmacyLabelDraft(draft: PharmacyLabelDraft, now = new Date()): PharmacySavedLabel {
  return { ...draft, sourceType: "manual", savedAt: now.toISOString() };
}

export function groupPharmacyLabelsForPaper(labels: PharmacyLabelDraft[], paper: PharmacyLabelPaper) {
  const columns = Math.max(1, Math.floor((paper.widthMm - paper.marginMm * 2) / DEFAULT_PHARMACY_LABEL_SIZE.widthMm));
  const rows = Math.max(1, Math.floor((paper.heightMm - paper.marginMm * 2) / DEFAULT_PHARMACY_LABEL_SIZE.heightMm));
  const pageSize = columns * rows;
  return Array.from({ length: Math.ceil(labels.length / pageSize) }, (_, pageIndex) =>
    labels.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/pharmacyLabelStudio.test.ts`

Expected: PASS.

---

### Task 3: Add Local Storage Repository

**Files:**
- Modify: `src/pharmacyLabelStudio.ts`
- Modify: `src/pharmacyLabelStudio.test.ts`

- [ ] **Step 1: Add repository tests**

Append to `src/pharmacyLabelStudio.test.ts`:

```ts
import {
  PHARMACY_LABEL_REPOSITORY_KEY,
  loadSavedPharmacyLabelsFromStorage,
  savePharmacyLabelToStorage,
} from "./pharmacyLabelStudio";

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

describe("pharmacy label local repository", () => {
  it("stores and reloads saved labels by code", () => {
    const storage = new MemoryStorage();
    const draft = createMatchedPharmacyLabelDraft(row);
    const saved = savePharmacyLabelToStorage(storage, draft, new Date("2026-07-02T00:00:00.000Z"));

    expect(storage.getItem(PHARMACY_LABEL_REPOSITORY_KEY)).toContain("A.01W-T");
    expect(loadSavedPharmacyLabelsFromStorage(storage)).toEqual([saved]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pharmacyLabelStudio.test.ts`

Expected: FAIL because repository exports do not exist.

- [ ] **Step 3: Implement repository helpers**

Append to `src/pharmacyLabelStudio.ts`:

```ts
export const PHARMACY_LABEL_REPOSITORY_KEY = "pharmacy-label-repository-v1";

export function loadSavedPharmacyLabelsFromStorage(storage: Pick<Storage, "getItem">): PharmacySavedLabel[] {
  const raw = storage.getItem(PHARMACY_LABEL_REPOSITORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PharmacySavedLabel[];
    return Array.isArray(parsed) ? parsed.filter((label) => label.code && label.savedAt) : [];
  } catch {
    return [];
  }
}

export function writeSavedPharmacyLabelsToStorage(storage: Pick<Storage, "setItem">, labels: PharmacySavedLabel[]) {
  storage.setItem(PHARMACY_LABEL_REPOSITORY_KEY, JSON.stringify(labels));
}

export function savePharmacyLabelToStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
  draft: PharmacyLabelDraft,
  now = new Date(),
) {
  const saved = savePharmacyLabelDraft(draft, now);
  const previous = loadSavedPharmacyLabelsFromStorage(storage);
  writeSavedPharmacyLabelsToStorage(storage, [...previous.filter((label) => label.id !== saved.id), saved]);
  return saved;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/pharmacyLabelStudio.test.ts`

Expected: PASS.

---

### Task 4: Build The Separate React Workspace

**Files:**
- Create: `src/PharmacyLabelStudio.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add component shell**

Create `src/PharmacyLabelStudio.tsx` with props and layout. The component must keep an editable draft state for the active drug, so size, title, warning, footer, border, and text controls change the canvas before saving:

```tsx
import { ArrowLeft, Printer, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  A3_PAPER,
  A4_PAPER,
  DEFAULT_PHARMACY_LABEL_SIZE,
  groupPharmacyLabelsForPaper,
  resolvePharmacyLabelDraft,
  savePharmacyLabelDraft,
  type PharmacyLabelDraft,
  type PharmacySavedLabel,
} from "./pharmacyLabelStudio";
import { matchesPharmacyLabelMatch, splitMatchedLabelCandidates, type PharmacyLabelMatchRow } from "./pharmacyLabelMatches";

type Props = {
  rows: PharmacyLabelMatchRow[];
  savedLabels: PharmacySavedLabel[];
  onBack: () => void;
  onSaveLabel: (draft: PharmacyLabelDraft) => void;
  onPrint: (labels: PharmacyLabelDraft[], paperKey: "A4" | "A3") => void;
};

export function PharmacyLabelStudio({ rows, savedLabels, onBack, onSaveLabel, onPrint }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState(rows[0]?.code ?? "");
  const [paper, setPaper] = useState<"A4" | "A3">("A4");
  const filteredRows = useMemo(() => rows.filter((row) => matchesPharmacyLabelMatch(row, query)).slice(0, 120), [query, rows]);
  const activeRow = rows.find((row) => row.code === activeCode) ?? filteredRows[0] ?? rows[0];
  const resolvedDraft = activeRow ? resolvePharmacyLabelDraft(activeRow, savedLabels) : undefined;
  const [draft, setDraft] = useState<PharmacyLabelDraft | undefined>(resolvedDraft);
  useEffect(() => {
    setDraft(resolvedDraft);
  }, [resolvedDraft?.id, resolvedDraft?.savedAt]);
  const selectedDrafts = rows
    .filter((row) => selectedCodes.includes(row.code))
    .map((row) => resolvePharmacyLabelDraft(row, savedLabels));
  const pages = groupPharmacyLabelsForPaper(selectedDrafts, paper === "A4" ? A4_PAPER : A3_PAPER);

  function toggleCode(code: string) {
    setSelectedCodes((previous) => (previous.includes(code) ? previous.filter((value) => value !== code) : [...previous, code]));
    setActiveCode(code);
  }

  function saveCurrent() {
    if (!draft) return;
    onSaveLabel(draft);
  }

  function patchDraft(patch: Partial<PharmacyLabelDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  return (
    <main className="pharmacy-label-studio">
      <header className="pharmacy-studio-topbar">
        <div>
          <p>별도 화면</p>
          <h1>약제팀 라벨 작업실</h1>
        </div>
        <label className="pharmacy-studio-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="약품코드, 약품명, 매칭 라벨 검색" />
        </label>
        <div className="pharmacy-studio-actions">
          <button type="button" className="print-button">약품리스트 관리</button>
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={16} />
            비품관리로 돌아가기
          </button>
        </div>
      </header>
      <nav className="pharmacy-label-tabs" aria-label="약제팀 라벨 종류">
        <button type="button" className="active">약품명 라벨</button>
        <button type="button">약품장 라벨</button>
        <button type="button">3단 약병장</button>
        <button type="button">외용장 라벨</button>
      </nav>
      <section className="pharmacy-studio-workspace">
        <aside className="pharmacy-drug-list">
          <div className="pharmacy-panel-head">
            <div>
              <h2>약품 리스트</h2>
              <p>복수 선택 후 일괄 출력</p>
            </div>
            <span className="badge gray">선택 {selectedCodes.length}</span>
          </div>
          <div className="pharmacy-list-filters">
            <span className="badge green">확정</span>
            <span className="badge amber">검토필요</span>
            <span className="badge red">미매칭</span>
            <span className="badge gray">항암제</span>
            <span className="badge gray">마약</span>
          </div>
          <div className="pharmacy-drug-list-scroll">
            {filteredRows.map((row) => (
              <button
                type="button"
                key={row.code}
                className={`pharmacy-drug-row ${row.code === activeRow?.code ? "selected" : ""}`}
                onClick={() => toggleCode(row.code)}
              >
                <input type="checkbox" checked={selectedCodes.includes(row.code)} readOnly />
                <span>
                  <strong>{row.englishName || row.koreanName}</strong>
                  <small>{row.code} · {[row.lightProtected ? "차광" : "", row.refrigerated ? "냉장" : "", row.anticancer ? "항암제" : ""].filter(Boolean).join(" · ")}</small>
                </span>
                <span className={`badge ${row.matchStatus === "확정" ? "green" : row.matchStatus === "검토필요" ? "amber" : "red"}`}>{row.matchStatus}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="pharmacy-label-canvas-panel">
          <div className="pharmacy-panel-head">
            <div>
              <h2>라벨 편집 캔버스</h2>
              <p>라벨 안에는 출력할 내용만 표시합니다.</p>
            </div>
            <span className="badge green">현재 {draft?.size.heightMm ?? DEFAULT_PHARMACY_LABEL_SIZE.heightMm} x {draft?.size.widthMm ?? DEFAULT_PHARMACY_LABEL_SIZE.widthMm} mm</span>
          </div>
          <div className="pharmacy-edit-modes">
            <button type="button" className="active">선택 라벨 수정</button>
            <button type="button">새 라벨 만들기</button>
            <button type="button">직접 그리기</button>
            <button type="button">텍스트 편집</button>
          </div>
          <div className="pharmacy-label-canvas">
            {draft ? (
              <article className="pharmacy-print-label" style={{
                "--pharmacy-label-width-mm": draft.size.widthMm,
                "--pharmacy-label-height-mm": draft.size.heightMm,
                "--pharmacy-label-border": `${draft.style.outerBorderPx}px solid ${draft.style.outerBorderColor}`,
                "--pharmacy-label-font-size": `${draft.style.fontSizePt}pt`,
                "--pharmacy-label-color": draft.style.fontColor,
                "--pharmacy-label-warning": draft.style.warningColor,
              } as CSSProperties}>
                {draft.printable.warning ? <div className="pharmacy-label-warning">{draft.printable.warning}</div> : null}
                <div className="pharmacy-label-main">{draft.printable.title}</div>
                {draft.printable.footer.enabled ? <footer>{draft.printable.footer.text}</footer> : null}
              </article>
            ) : (
              <span className="empty">표시할 라벨이 없습니다.</span>
            )}
          </div>
          <div className="pharmacy-canvas-status">
            <span className="badge gray">약품코드 {draft?.code ?? "-"}</span>
            <span className="badge gray">{draft?.sourceType === "manual" ? "저장 라벨" : "엑셀 매칭 기본"}</span>
          </div>
          <div className="pharmacy-save-row">
            <span>저장하면 해당 약품의 최신 라벨 기본값으로 다시 열립니다.</span>
            <button type="button" className="secondary-button" onClick={() => onPrint(selectedDrafts, paper)} disabled={selectedDrafts.length === 0}>
              <Printer size={16} />
              전체 페이지 출력
            </button>
            <button type="button" className="print-button" onClick={saveCurrent} disabled={!draft}>
              <Save size={16} />
              수정 라벨 저장
            </button>
          </div>
        </section>
        <aside className="pharmacy-tool-panel">
          <details open>
            <summary>크기 설정</summary>
            <div className="pharmacy-tool-body">
              <button type="button" className="pharmacy-size-preset active">35 x 100 mm</button>
              <button type="button" className="pharmacy-size-preset">25 x 70 mm</button>
              <button type="button" className="pharmacy-size-preset">50 x 30 mm</button>
              <div className="pharmacy-custom-size">
                <label>가로 mm<input value={draft?.size.widthMm ?? 100} onChange={(event) => draft && patchDraft({ size: { ...draft.size, presetKey: "custom", widthMm: Number(event.target.value) || draft.size.widthMm } })} /></label>
                <label>세로 mm<input value={draft?.size.heightMm ?? 35} onChange={(event) => draft && patchDraft({ size: { ...draft.size, presetKey: "custom", heightMm: Number(event.target.value) || draft.size.heightMm } })} /></label>
              </div>
            </div>
          </details>
          <details open>
            <summary>테두리 설정</summary>
            <div className="pharmacy-tool-body">
              <span>외곽선 {draft?.style.outerBorderPx ?? 3}px</span>
              <span>색상 {draft?.style.outerBorderColor ?? "#111827"}</span>
            </div>
          </details>
          <details>
            <summary>하단 문구</summary>
            <div className="pharmacy-tool-body">
              <label><input type="checkbox" checked={draft?.printable.footer.enabled ?? false} onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, footer: { ...draft.printable.footer, enabled: event.target.checked } } })} /> 하단 문구 영역 사용</label>
              <input value={draft?.printable.footer.text ?? ""} onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, footer: { ...draft.printable.footer, text: event.target.value } } })} />
            </div>
          </details>
          <details open>
            <summary>글씨 설정</summary>
            <div className="pharmacy-tool-body">
              <textarea value={draft?.printable.title ?? ""} onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, title: event.target.value } })} />
              <input value={draft?.printable.warning ?? ""} onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, warning: event.target.value } })} />
            </div>
          </details>
          <details>
            <summary>매칭 상세</summary>
            <div className="pharmacy-tool-body">
              {activeRow ? (
                <>
                  <span>매칭상태: {activeRow.matchStatus}</span>
                  <span>매칭점수: {activeRow.matchScore}</span>
                  <span>원본 위치: {activeRow.sourceLocation || "-"}</span>
                  {splitMatchedLabelCandidates(activeRow.matchedLabel).map((candidate) => <span key={candidate}>{candidate}</span>)}
                </>
              ) : null}
            </div>
          </details>
          <details>
            <summary>출력 용지</summary>
            <div className="pharmacy-tool-body">
              <label><input type="radio" checked={paper === "A4"} onChange={() => setPaper("A4")} /> A4</label>
              <label><input type="radio" checked={paper === "A3"} onChange={() => setPaper("A3")} /> A3</label>
              <span>{pages.length}페이지로 출력 예정</span>
            </div>
          </details>
        </aside>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Wire `App.tsx` to open this workspace**

Modify imports in `src/App.tsx`:

```ts
import { PharmacyLabelStudio } from "./PharmacyLabelStudio";
import { loadPharmacyLabelMatchRows, type PharmacyLabelMatchRow } from "./pharmacyLabelMatches";
import {
  loadSavedPharmacyLabelsFromStorage,
  savePharmacyLabelToStorage,
  type PharmacyLabelDraft,
  type PharmacySavedLabel,
} from "./pharmacyLabelStudio";
```

Add state near other label state:

```ts
const [isPharmacyLabelWorkspaceOpen, setIsPharmacyLabelWorkspaceOpen] = useState(appMode === "pharmacy-viewer");
const [pharmacyLabelMatchRows, setPharmacyLabelMatchRows] = useState<PharmacyLabelMatchRow[]>([]);
const [savedPharmacyLabels, setSavedPharmacyLabels] = useState<PharmacySavedLabel[]>(() =>
  typeof window === "undefined" ? [] : loadSavedPharmacyLabelsFromStorage(window.localStorage),
);
```

Add effect:

```ts
useEffect(() => {
  if (!isPharmacyLabelWorkspaceOpen || pharmacyLabelMatchRows.length > 0) return;
  loadPharmacyLabelMatchRows().then(setPharmacyLabelMatchRows);
}, [isPharmacyLabelWorkspaceOpen, pharmacyLabelMatchRows.length]);
```

Add handlers:

```ts
function savePharmacyStudioLabel(draft: PharmacyLabelDraft) {
  if (typeof window === "undefined") return;
  savePharmacyLabelToStorage(window.localStorage, draft);
  setSavedPharmacyLabels(loadSavedPharmacyLabelsFromStorage(window.localStorage));
}

function printPharmacyStudioLabels(labels: PharmacyLabelDraft[], paperKey: "A4" | "A3") {
  setLabelPrintSelections(
    labels.map((label) => ({
      id: `pharmacy-${label.code}`,
      mode: "pharmacy",
      sizeKey: "35x100",
    })),
  );
  setLabelMode("pharmacy");
  setPrintPreviewMode("drug-labels");
  setShowPrintPreview(true);
}
```

Render early after header state is ready:

```tsx
if (isPharmacyLabelWorkspaceOpen) {
  return (
    <PharmacyLabelStudio
      rows={pharmacyLabelMatchRows}
      savedLabels={savedPharmacyLabels}
      onBack={() => setIsPharmacyLabelWorkspaceOpen(false)}
      onSaveLabel={savePharmacyStudioLabel}
      onPrint={printPharmacyStudioLabels}
    />
  );
}
```

Change the pharmacy segmented button click to open the workspace:

```tsx
onClick={() => {
  if (option.mode === "pharmacy") {
    setIsPharmacyLabelWorkspaceOpen(true);
    setLabelMode("pharmacy");
    return;
  }
  setLabelMode(option.mode);
}}
```

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS or only type errors that identify missing imports from this task.

---

### Task 5: Style The Approved Workspace And Clean Printable Label

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add workspace styles**

Append this CSS block to `src/styles.css`:

```css
.pharmacy-label-studio {
  min-height: 100vh;
  background: #f7f8fa;
}

.pharmacy-studio-topbar {
  display: grid;
  grid-template-columns: minmax(220px, 0.65fr) minmax(320px, 1.1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  color: #fff;
  background: var(--brand-header);
}

.pharmacy-studio-topbar p,
.pharmacy-studio-topbar h1 {
  margin: 0;
}

.pharmacy-studio-topbar p {
  color: #f3ece7;
  font-size: 12px;
  font-weight: 800;
}

.pharmacy-studio-search {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #d7c7bc;
  border-radius: 7px;
  color: #96796a;
  background: #fff;
}

.pharmacy-studio-search input {
  border: 0;
  outline: 0;
}

.pharmacy-studio-actions,
.pharmacy-label-tabs,
.pharmacy-edit-modes,
.pharmacy-save-row,
.pharmacy-canvas-status,
.pharmacy-list-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pharmacy-label-tabs {
  padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft);
  background: #fbfaf9;
}

.pharmacy-label-tabs button,
.pharmacy-edit-modes button,
.pharmacy-size-preset {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--brand-header);
  background: #fff;
  font-weight: 900;
}

.pharmacy-label-tabs button.active,
.pharmacy-edit-modes button.active,
.pharmacy-size-preset.active {
  color: #fff;
  border-color: #6f5a50;
  background: var(--brand-header);
}

.pharmacy-studio-workspace {
  display: grid;
  grid-template-columns: minmax(230px, 0.78fr) minmax(420px, 1.45fr) minmax(285px, 0.95fr);
  gap: 12px;
  padding: 14px;
}

.pharmacy-drug-list,
.pharmacy-label-canvas-panel,
.pharmacy-tool-panel {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.pharmacy-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.pharmacy-panel-head h2,
.pharmacy-panel-head p {
  margin: 0;
}

.pharmacy-panel-head h2 {
  font-size: 16px;
}

.pharmacy-panel-head p {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.pharmacy-list-filters {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-soft);
}

.pharmacy-drug-list-scroll {
  display: grid;
  gap: 7px;
  max-height: calc(100vh - 240px);
  overflow: auto;
  padding: 10px 12px;
}

.pharmacy-drug-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 9px;
  border: 1px solid var(--line-soft);
  border-radius: 7px;
  background: #fff;
  text-align: left;
}

.pharmacy-drug-row.selected {
  border-color: var(--brand-orange);
  background: #fff8f3;
  box-shadow: inset 4px 0 0 var(--brand-orange);
}

.pharmacy-drug-row strong,
.pharmacy-drug-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pharmacy-drug-row small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

.pharmacy-edit-modes {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-soft);
  background: #fbfaf9;
}

.pharmacy-label-canvas {
  display: flex;
  min-height: 315px;
  align-items: center;
  justify-content: center;
  margin: 14px;
  border: 1px dashed #c7d7e5;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.10) 1px, transparent 1px),
    linear-gradient(0deg, rgba(148, 163, 184, 0.10) 1px, transparent 1px),
    #f8fbfd;
  background-size: 22px 22px;
}

.pharmacy-print-label {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  width: calc(var(--pharmacy-label-width-mm, 100) * 1mm);
  height: calc(var(--pharmacy-label-height-mm, 35) * 1mm);
  overflow: hidden;
  border: var(--pharmacy-label-border, 3px solid #111827);
  border-radius: 4px;
  color: var(--pharmacy-label-color, #111827);
  background: #fff;
}

.pharmacy-label-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 17mm;
  padding: 0 1mm;
  border-right: 2px solid #111827;
  color: var(--pharmacy-label-warning, #d92d20);
  font-weight: 1000;
  line-height: 1.12;
  text-align: center;
  white-space: pre-line;
}

.pharmacy-label-main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2mm 4mm;
  font-size: var(--pharmacy-label-font-size, 25pt);
  font-weight: 1000;
  line-height: 1.06;
  text-align: center;
  white-space: pre-line;
}

.pharmacy-print-label footer {
  grid-column: 1 / -1;
  border-top: 2px solid #111827;
  text-align: center;
}

.pharmacy-canvas-status,
.pharmacy-save-row {
  padding: 0 14px 12px;
}

.pharmacy-save-row {
  align-items: center;
  justify-content: space-between;
}

.pharmacy-tool-panel details {
  border-bottom: 1px solid var(--line-soft);
}

.pharmacy-tool-panel summary {
  cursor: pointer;
  padding: 12px;
  font-weight: 1000;
  list-style: none;
}

.pharmacy-tool-body {
  display: grid;
  gap: 8px;
  padding: 0 12px 12px;
  color: #475467;
  font-size: 12px;
  font-weight: 850;
}

.pharmacy-custom-size {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.pharmacy-custom-size label {
  display: grid;
  gap: 4px;
}

.pharmacy-custom-size input {
  min-height: 32px;
  padding: 0 8px;
  border: 1px solid var(--line-soft);
  border-radius: 6px;
}

@media (max-width: 980px) {
  .pharmacy-studio-topbar,
  .pharmacy-studio-workspace {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Verify layout by build**

Run: `npm run build`

Expected: PASS.

---

### Task 6: Print Preview And Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pharmacyLabelStudio.ts`
- Modify: `src/pharmacyLabelStudio.test.ts`

- [ ] **Step 1: Preserve selected pharmacy labels for batch output**

If the existing print flow cannot render saved manual labels, add `pharmacyPrintDrafts` state to `App.tsx`:

```ts
const [pharmacyPrintDrafts, setPharmacyPrintDrafts] = useState<PharmacyLabelDraft[]>([]);
```

Update `printPharmacyStudioLabels`:

```ts
function printPharmacyStudioLabels(labels: PharmacyLabelDraft[], paperKey: "A4" | "A3") {
  setPharmacyPrintDrafts(labels);
  setPrintPreviewMode("drug-labels");
  setShowPrintPreview(true);
}
```

Render pharmacy print drafts in `renderDrugLabelSheet` before existing `labelPrintRows` when `pharmacyPrintDrafts.length > 0`:

```tsx
{pharmacyPrintDrafts.length > 0
  ? pharmacyPrintDrafts.map((draft) => (
      <article className="pharmacy-print-label print-label" key={draft.id}>
        {draft.printable.warning ? <div className="pharmacy-label-warning">{draft.printable.warning}</div> : null}
        <div className="pharmacy-label-main">{draft.printable.title}</div>
        {draft.printable.footer.enabled ? <footer>{draft.printable.footer.text}</footer> : null}
      </article>
    ))
  : labelPrintRows.map((entry, index) => renderDrugLabelArticle(entry, `${entry.id}-${entry.sizeKey}-${entry.copyIndex}-${index}`))}
```

- [ ] **Step 2: Run complete verification**

Run:

```powershell
npm run generate:label-matches
npm test
npm run build
```

Expected: all commands pass.

- [ ] **Step 3: Start local preview**

Run: `npm run dev`

Expected: Vite prints a local URL. Open the URL and verify:

- Click `약품 라벨 출력`.
- Click `약제팀 라벨`.
- The separate pharmacy label workspace opens.
- The full stock master is not visible underneath.
- The drug list hides score/source location.
- The canvas label has no management text and no empty footer row.
- The right `매칭 상세` panel contains score/source location.
- A4/A3 paper selection shows page count.

---

## Self-Review

- Spec coverage: Tasks cover separate screen, three-column layout, hidden list metadata, matched workbook data, saved-label precedence, default 35 x 100 mm size, custom size model, clean printable label, batch print, and documentation.
- Empty-work scan: The plan contains no TBD, TODO, or unfinished implementation steps. Empty tabs are explicitly rendered as inactive tab buttons in Task 4.
- Type consistency: `PharmacyLabelMatchRow`, `PharmacyLabelDraft`, `PharmacySavedLabel`, and paper keys are introduced before UI usage and reused consistently.
