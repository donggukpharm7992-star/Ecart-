import { ArrowLeft, Printer, Save, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  A3_PAPER,
  A4_PAPER,
  DEFAULT_PHARMACY_LABEL_SIZE,
  PHARMACY_LABEL_SIZE_PRESETS,
  groupPharmacyLabelsForPaper,
  resolvePharmacyLabelDraft,
  type PharmacyLabelDraft,
  type PharmacyLabelSize,
  type PharmacySavedLabel,
} from "./pharmacyLabelStudio";
import { matchesPharmacyLabelMatch, splitMatchedLabelCandidates, type PharmacyLabelMatchRow } from "./pharmacyLabelMatches";

type PharmacyLabelStudioProps = {
  rows: PharmacyLabelMatchRow[];
  savedLabels: PharmacySavedLabel[];
  isLoading: boolean;
  onBack: () => void;
  onSaveLabel: (draft: PharmacyLabelDraft) => void;
  onPrint: (labels: PharmacyLabelDraft[], paperKey: "A4" | "A3") => void;
  onHospitalDrugWorkbookUpload: (file: File) => Promise<string>;
};

function matchBadgeClass(status: string) {
  if (status === "확정") return "green";
  if (status === "검토필요") return "amber";
  return "red";
}

function storageMeta(row: PharmacyLabelMatchRow) {
  const storage = row.storage.replace(/\s+/g, "");
  if (row.frozen || storage.includes("냉동")) return "냉동";
  if (row.refrigerated) return "냉장";
  return "";
}

function labelMeta(row: PharmacyLabelMatchRow) {
  return [
    row.code,
    row.lightProtected ? "차광" : "",
    storageMeta(row),
    row.doseCaution ? "용량주의" : "",
    row.similarSound ? "유사발음" : "",
    row.similarLook ? "유사모양" : "",
    row.anticancer ? "항암제" : "",
    row.narcotic ? "마약" : "",
    row.psychotropic ? "향정" : "",
    row.highRisk ? "고위험" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function clampMm(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(5, Math.min(300, Math.round(value * 10) / 10));
}

export function PharmacyLabelWorkspace({
  rows,
  savedLabels,
  isLoading,
  onBack,
  onSaveLabel,
  onPrint,
  onHospitalDrugWorkbookUpload,
}: PharmacyLabelStudioProps) {
  const [query, setQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState("");
  const [paper, setPaper] = useState<"A4" | "A3">("A4");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploadingWorkbook, setIsUploadingWorkbook] = useState(false);

  const filteredRows = useMemo(() => rows.filter((row) => matchesPharmacyLabelMatch(row, query)).slice(0, 160), [query, rows]);
  const activeRow = rows.find((row) => row.code === activeCode) ?? filteredRows[0] ?? rows[0];
  const resolvedDraft = activeRow ? resolvePharmacyLabelDraft(activeRow, savedLabels) : undefined;
  const [draft, setDraft] = useState<PharmacyLabelDraft | undefined>(resolvedDraft);

  useEffect(() => {
    if (!activeCode && rows[0]) setActiveCode(rows[0].code);
  }, [activeCode, rows]);

  useEffect(() => {
    setDraft(resolvedDraft);
  }, [resolvedDraft?.id, resolvedDraft?.savedAt, resolvedDraft?.sourceType]);

  const selectedDrafts = useMemo(
    () =>
      rows
        .filter((row) => selectedCodes.includes(row.code))
        .map((row) => (draft && draft.code === row.code ? draft : resolvePharmacyLabelDraft(row, savedLabels))),
    [draft, rows, savedLabels, selectedCodes],
  );
  const pages = groupPharmacyLabelsForPaper(selectedDrafts, paper === "A4" ? A4_PAPER : A3_PAPER);

  function toggleCode(code: string) {
    setSelectedCodes((previous) => (previous.includes(code) ? previous.filter((value) => value !== code) : [...previous, code]));
    setActiveCode(code);
  }

  function patchDraft(patch: Partial<PharmacyLabelDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function patchSize(size: Partial<PharmacyLabelSize>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            size: {
              ...current.size,
              ...size,
            },
          }
        : current,
    );
  }

  function saveCurrent() {
    if (!draft) return;
    onSaveLabel(draft);
  }

  async function handleHospitalDrugWorkbookUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setIsUploadingWorkbook(true);
    setUploadStatus("");
    try {
      const message = await onHospitalDrugWorkbookUpload(file);
      setUploadStatus(message);
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : "엑셀 파일을 불러오지 못했습니다.");
    } finally {
      setIsUploadingWorkbook(false);
    }
  }

  const labelStyle =
    draft == null
      ? undefined
      : ({
          "--pharmacy-label-width-mm": draft.size.widthMm,
          "--pharmacy-label-height-mm": draft.size.heightMm,
          "--pharmacy-label-border": `${draft.style.outerBorderPx}px solid ${draft.style.outerBorderColor}`,
          "--pharmacy-label-font-size": `${draft.style.fontSizePt}pt`,
          "--pharmacy-label-color": draft.style.fontColor,
          "--pharmacy-label-warning": draft.style.warningColor,
          "--pharmacy-label-font-family": draft.style.fontFamily,
          "--pharmacy-label-outline-color": draft.style.textOutlineColor,
          "--pharmacy-label-outline-px": `${draft.style.textOutlinePx}px`,
        } as CSSProperties);

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
          <button type="button" className="print-button">
            약품리스트 관리
          </button>
          <label className="print-button pharmacy-upload-button" aria-disabled={isUploadingWorkbook} aria-label="원내보유의약품리스트 엑셀 업로드">
            <Upload size={16} />
            {isUploadingWorkbook ? "업로드 중" : "엑셀 업로드"}
            <input
              className="hidden-file-input"
              type="file"
              accept=".xlsx,.xlsm"
              disabled={isUploadingWorkbook}
              onChange={handleHospitalDrugWorkbookUpload}
            />
          </label>
          <button type="button" className="secondary-button" onClick={onBack}>
            <ArrowLeft size={16} />
            비품관리로 돌아가기
          </button>
          {uploadStatus ? <span className="pharmacy-upload-status">{uploadStatus}</span> : null}
        </div>
      </header>

      <nav className="pharmacy-label-tabs" aria-label="약제팀 라벨 종류">
        <button type="button" className="active">
          약품명 라벨
        </button>
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
            {isLoading ? <span className="empty">약제팀 라벨 데이터를 불러오는 중입니다.</span> : null}
            {!isLoading && filteredRows.length === 0 ? <span className="empty">검색 결과가 없습니다.</span> : null}
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
                  <small>{labelMeta(row)}</small>
                </span>
                <span className={`badge ${matchBadgeClass(row.matchStatus)}`}>{row.matchStatus}</span>
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
            <span className="badge green">
              현재 {draft?.size.heightMm ?? DEFAULT_PHARMACY_LABEL_SIZE.heightMm} x {draft?.size.widthMm ?? DEFAULT_PHARMACY_LABEL_SIZE.widthMm} mm
            </span>
          </div>
          <div className="pharmacy-edit-modes">
            <button type="button" className="active">
              선택 라벨 수정
            </button>
            <button type="button">새 라벨 만들기</button>
            <button type="button">직접 그리기</button>
            <button type="button">텍스트 편집</button>
          </div>
          <div className="pharmacy-label-canvas">
            {draft ? (
              <article className="pharmacy-print-label" style={labelStyle}>
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
            <div className="pharmacy-paper-mini" aria-label="출력 용지 선택">
              <button type="button" className={paper === "A4" ? "active" : ""} onClick={() => setPaper("A4")}>
                A4
              </button>
              <button type="button" className={paper === "A3" ? "active" : ""} onClick={() => setPaper("A3")}>
                A3
              </button>
              <small>{selectedDrafts.length === 0 ? "선택 없음" : `${pages.length}p`}</small>
            </div>
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
              <div className="pharmacy-size-grid">
                {PHARMACY_LABEL_SIZE_PRESETS.map((size) => (
                  <button
                    type="button"
                    key={size.presetKey}
                    className={`pharmacy-size-preset ${draft?.size.presetKey === size.presetKey ? "active" : ""}`}
                    onClick={() => patchDraft({ size })}
                  >
                    {size.heightMm} x {size.widthMm} mm
                  </button>
                ))}
              </div>
              <div className="pharmacy-custom-size">
                <label>
                  가로 mm
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={draft?.size.widthMm ?? DEFAULT_PHARMACY_LABEL_SIZE.widthMm}
                    onChange={(event) => patchSize({ presetKey: "custom", widthMm: clampMm(Number(event.target.value), draft?.size.widthMm ?? 100) })}
                  />
                </label>
                <label>
                  세로 mm
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={draft?.size.heightMm ?? DEFAULT_PHARMACY_LABEL_SIZE.heightMm}
                    onChange={(event) => patchSize({ presetKey: "custom", heightMm: clampMm(Number(event.target.value), draft?.size.heightMm ?? 35) })}
                  />
                </label>
              </div>
            </div>
          </details>

          <details open>
            <summary>테두리 설정</summary>
            <div className="pharmacy-tool-body">
              <label>
                외곽선 두께
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={draft?.style.outerBorderPx ?? 3}
                  onChange={(event) =>
                    draft && patchDraft({ style: { ...draft.style, outerBorderPx: Math.max(0, Number(event.target.value) || 0) } })
                  }
                />
              </label>
              <label>
                외곽선 색상
                <input
                  type="color"
                  value={draft?.style.outerBorderColor ?? "#111827"}
                  onChange={(event) => draft && patchDraft({ style: { ...draft.style, outerBorderColor: event.target.value } })}
                />
              </label>
              <label>
                글자 테두리 두께
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={draft?.style.textOutlinePx ?? 0}
                  onChange={(event) =>
                    draft && patchDraft({ style: { ...draft.style, textOutlinePx: Math.max(0, Number(event.target.value) || 0) } })
                  }
                />
              </label>
              <label>
                글자 테두리 색상
                <input
                  type="color"
                  value={draft?.style.textOutlineColor ?? "#ffffff"}
                  onChange={(event) => draft && patchDraft({ style: { ...draft.style, textOutlineColor: event.target.value } })}
                />
              </label>
            </div>
          </details>

          <details open>
            <summary>글씨 설정</summary>
            <div className="pharmacy-tool-body">
              <label>
                약품명
                <textarea
                  value={draft?.printable.title ?? ""}
                  onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, title: event.target.value } })}
                />
              </label>
              <label>
                주의 문구
                <input
                  value={draft?.printable.warning ?? ""}
                  onChange={(event) => draft && patchDraft({ printable: { ...draft.printable, warning: event.target.value } })}
                />
              </label>
              <label>
                폰트 크기
                <input
                  type="number"
                  min={6}
                  max={80}
                  value={draft?.style.fontSizePt ?? 25}
                  onChange={(event) => draft && patchDraft({ style: { ...draft.style, fontSizePt: Math.max(6, Number(event.target.value) || 25) } })}
                />
              </label>
              <label>
                약품명 색상
                <input
                  type="color"
                  value={draft?.style.fontColor ?? "#111827"}
                  onChange={(event) => draft && patchDraft({ style: { ...draft.style, fontColor: event.target.value } })}
                />
              </label>
              <label>
                주의문구 색상
                <input
                  type="color"
                  value={draft?.style.warningColor ?? "#d92d20"}
                  onChange={(event) => draft && patchDraft({ style: { ...draft.style, warningColor: event.target.value } })}
                />
              </label>
            </div>
          </details>

          <details>
            <summary>하단 문구</summary>
            <div className="pharmacy-tool-body">
              <label>
                <input
                  type="checkbox"
                  checked={draft?.printable.footer.enabled ?? false}
                  onChange={(event) =>
                    draft &&
                    patchDraft({
                      printable: { ...draft.printable, footer: { ...draft.printable.footer, enabled: event.target.checked } },
                    })
                  }
                />
                하단 문구 영역 사용
              </label>
              <input
                value={draft?.printable.footer.text ?? ""}
                onChange={(event) =>
                  draft && patchDraft({ printable: { ...draft.printable, footer: { ...draft.printable.footer, text: event.target.value } } })
                }
              />
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
                  {splitMatchedLabelCandidates(activeRow.matchedLabel).map((candidate) => (
                    <span key={candidate}>{candidate}</span>
                  ))}
                </>
              ) : null}
            </div>
          </details>

        </aside>
      </section>
    </main>
  );
}
