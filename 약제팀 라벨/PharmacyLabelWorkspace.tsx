import { ArrowLeft, ChevronDown, FileDown, Printer, Save, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { matchesHospitalDrugLabel, type HospitalDrugLabelRow } from "./hospitalDrugLabels";
import {
  A3_PAPER, A4_PAPER, CABINET_CATEGORIES, DRUG_CATEGORIES, WARNING_OPTIONS,
  groupPharmacyLabelsForPaper, resolvePharmacyLabelDraft, rowMatchesCategory, sizesForCategory,
  type PharmacyLabelCategory, type PharmacyLabelDraft, type PharmacyLabelFamily, type PharmacySavedLabel,
  type PharmacyHighCostRoute,
} from "./pharmacyLabelStudio";

type Props = {
  rows: HospitalDrugLabelRow[];
  savedLabels: PharmacySavedLabel[];
  isLoading: boolean;
  onBack: () => void;
  onSaveLabel: (draft: PharmacyLabelDraft) => void;
  onPrint: (labels: PharmacyLabelDraft[], paperKey: "A4" | "A3") => void;
  onHospitalDrugWorkbookUpload: (file: File) => Promise<string>;
};

export function PharmacyLabelWorkspace({ rows, savedLabels, isLoading, onBack, onSaveLabel, onPrint, onHospitalDrugWorkbookUpload }: Props) {
  const [family, setFamily] = useState<PharmacyLabelFamily>("drug");
  const [category, setCategory] = useState<PharmacyLabelCategory>("원병");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [activeCode, setActiveCode] = useState("");
  const [paper, setPaper] = useState<"A4" | "A3">("A4");
  const [draft, setDraft] = useState<PharmacyLabelDraft>();
  const [uploadStatus, setUploadStatus] = useState("");
  const [editMode, setEditMode] = useState<"edit" | "new">("edit");
  const [highCostRoute, setHighCostRoute] = useState<PharmacyHighCostRoute>("주사");

  const categoryRows = useMemo(
    () => rows.filter((row) => rowMatchesCategory(row, category, highCostRoute) && matchesHospitalDrugLabel(row, query)),
    [category, highCostRoute, query, rows],
  );
  const activeRow = categoryRows.find((row) => row.code === activeCode) ?? categoryRows[0];
  useEffect(() => {
    if (!activeRow) { setDraft(undefined); return; }
    setActiveCode(activeRow.code);
    setDraft(resolvePharmacyLabelDraft(activeRow, savedLabels, category, family));
  }, [activeRow?.code, category, family, savedLabels]);

  const selectedDrafts = useMemo(
    () => categoryRows.filter((row) => selectedCodes.includes(row.code)).map((row) =>
      draft?.code === row.code ? draft : resolvePharmacyLabelDraft(row, savedLabels, category, family)),
    [categoryRows, selectedCodes, draft, savedLabels, category, family],
  );
  const pages = groupPharmacyLabelsForPaper(selectedDrafts, paper === "A4" ? A4_PAPER : A3_PAPER);
  const allSelected = categoryRows.length > 0 && categoryRows.every((row) => selectedCodes.includes(row.code));
  const categoryGroups = family === "drug" ? DRUG_CATEGORIES : CABINET_CATEGORIES;
  const sizeOptions = sizesForCategory(category, activeRow);
  const hasDoseHighlight = draft?.warnings.some((warning) => warning === "용량주의" || warning === "용량확인") ?? false;
  const hasCautionWarning = draft?.warnings.some((warning) => ["용량주의", "용량확인", "유사발음", "유사모양", "이름주의", "고위험의약품"].includes(warning)) ?? false;
  const hasColdWarning = draft?.warnings.includes("냉장") ?? false;
  const hasLightWarning = draft?.warnings.includes("차광") ?? false;
  const storageOnlyClass = !hasCautionWarning && hasColdWarning && hasLightWarning
    ? "storage-both"
    : !hasCautionWarning && hasColdWarning
      ? "storage-cold"
      : !hasCautionWarning && hasLightWarning
        ? "storage-light"
        : "";

  function patch(patchValue: Partial<PharmacyLabelDraft>) {
    setDraft((current) => current ? { ...current, ...patchValue } : current);
  }
  function setCategoryAndReset(next: PharmacyLabelCategory) {
    setCategory(next); setSelectedCodes([]); setActiveCode("");
  }
  function toggleWarning(value: string) {
    if (!draft) return;
    const warnings = draft.warnings.includes(value) ? draft.warnings.filter((item) => item !== value) : [...draft.warnings, value];
    patch({ warnings, printable: { ...draft.printable, warning: warnings.join(" · ") } });
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
    if (!file) return;
    try { setUploadStatus(await onHospitalDrugWorkbookUpload(file)); } catch (error) { setUploadStatus(error instanceof Error ? error.message : "파일을 불러오지 못했습니다."); }
  }

  const labelStyle = draft ? ({
    "--pharmacy-label-width-mm": draft.size.widthMm,
    "--pharmacy-label-height-mm": draft.size.heightMm,
    "--pharmacy-label-border": `${draft.style.outerBorderPx}px solid ${draft.style.outerBorderColor}`,
    "--pharmacy-label-font-size": `${draft.style.fontSizePt}pt`,
    "--pharmacy-label-color": draft.style.fontColor,
    "--pharmacy-label-warning": draft.style.warningColor,
  } as CSSProperties) : undefined;

  return <main className="pharmacy-label-studio">
    <header className="pharmacy-studio-topbar">
      <div><p>원내보유의약품리스트 기준</p><h1>약제팀 라벨 작업실</h1></div>
      <label className="pharmacy-studio-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="약품코드, 물품코드, 약품명 검색"/></label>
      <div className="pharmacy-studio-actions">
        <label className="print-button pharmacy-upload-button"><Upload size={16}/>원내보유약품 업데이트<input className="hidden-file-input" type="file" accept=".xlsx,.xlsm" onChange={upload}/></label>
        <button className="secondary-button" onClick={onBack}><ArrowLeft size={16}/>비품관리로 돌아가기</button>
        {uploadStatus && <span className="pharmacy-upload-status">{uploadStatus}</span>}
      </div>
    </header>

    <section className="pharmacy-category-panel">
      <div className="pharmacy-label-tabs">
        <button className={family === "drug" ? "active" : ""} onClick={() => setFamily("drug")}>약품 라벨</button>
        <button className={family === "cabinet" ? "active" : ""} onClick={() => setFamily("cabinet")}>약품장 라벨</button>
        <button className="pharmacy-collapse-button" onClick={() => setDetailsOpen((value) => !value)}>상세 선택 <ChevronDown size={16}/></button>
      </div>
      {detailsOpen && <div className="pharmacy-category-groups">{categoryGroups.map((group, index) =>
        <div className="pharmacy-category-row" key={index}>{group.map((item) =>
          <button key={item} className={category === item ? "active" : ""} onClick={() => setCategoryAndReset(item)}>{item}</button>)}
          {family === "cabinet" && index === 0 && ["원병", "PTP"].includes(category) && <button onClick={() => draft && patch({ accessory: "선반라벨" })}>선반라벨</button>}
        </div>)}
        {category === "고가약" && <div className="pharmacy-high-cost-routes" aria-label="고가약 투여 경로">
          <strong>고가약 구분</strong>
          {(["주사", "경구"] as const).map((route) => <button key={route} className={highCostRoute === route ? "active" : ""} onClick={() => { setHighCostRoute(route); setSelectedCodes([]); setActiveCode(""); }}>{route}</button>)}
        </div>}
      </div>}
    </section>

    <section className="pharmacy-studio-workspace">
      <aside className="pharmacy-drug-list">
        <div className="pharmacy-panel-head"><div><h2>{category} 약품 리스트</h2><p>{categoryRows.length.toLocaleString("ko-KR")}개</p></div><span className="badge gray">선택 {selectedCodes.length}</span></div>
        <label className="pharmacy-select-all"><input type="checkbox" checked={allSelected} onChange={() => setSelectedCodes(allSelected ? [] : categoryRows.map((row) => row.code))}/>전체 선택</label>
        <div className="pharmacy-drug-list-scroll">
          {isLoading && <span className="empty">약품 데이터를 불러오는 중입니다.</span>}
          {!isLoading && categoryRows.length === 0 && <span className="empty">해당 분류의 원내보유약품이 없습니다.</span>}
          {categoryRows.map((row) => <label key={row.code} className={`pharmacy-drug-row ${row.code === activeRow?.code ? "selected" : ""}`}>
            <input type="checkbox" checked={selectedCodes.includes(row.code)} onChange={() => setSelectedCodes((prev) => prev.includes(row.code) ? prev.filter((code) => code !== row.code) : [...prev, row.code])}/>
            <button type="button" onClick={() => setActiveCode(row.code)}><strong>{row.name}</strong><small>{row.koreanName} · {row.code} · {row.strength}</small></button>
          </label>)}
        </div>
      </aside>

      <section className="pharmacy-label-canvas-panel">
        <div className="pharmacy-panel-head"><div><h2>라벨 편집 캔버스</h2><p>선택한 라벨을 편집한 뒤 최종본으로 저장합니다.</p></div></div>
        <div className="pharmacy-edit-modes"><button className={editMode === "edit" ? "active" : ""} onClick={() => setEditMode("edit")}>선택 라벨 수정</button><button className={editMode === "new" ? "active" : ""} onClick={() => setEditMode("new")}>새 라벨 만들기</button></div>
        {editMode === "new" && draft && <div className="pharmacy-new-label-fields">
          <input placeholder="상용약품명" value={draft.printable.title} onChange={(e) => patch({ printable: {...draft.printable, title: e.target.value} })}/>
          <input placeholder="한글약품명" value={draft.printable.koreanName} onChange={(e) => patch({ printable: {...draft.printable, koreanName: e.target.value} })}/>
          <input placeholder="약품코드" value={draft.code} onChange={(e) => patch({ code: e.target.value })}/><input placeholder="물품코드" value={draft.itemCode} onChange={(e) => patch({ itemCode: e.target.value })}/>
        </div>}
        <div className="pharmacy-label-canvas">{draft ? <article className={`pharmacy-print-label ${category === "항암제" ? "anticancer" : ""} ${category === "고가약" ? "high-cost" : ""} ${storageOnlyClass}`} style={labelStyle}>
          {(draft.printable.topBanner || (draft.printable.warning && category !== "항암제")) && <div className="pharmacy-label-top-banner">
            <span>{[draft.printable.topBanner, category !== "항암제" ? draft.warnings.filter((warning) => !["냉장", "차광"].includes(warning)).join(" · ") : ""].filter(Boolean).join(" · ")}</span>
            {hasLightWarning && <b className="pharmacy-storage-badge light">차광</b>}
            {hasColdWarning && <b className="pharmacy-storage-badge cold">냉장</b>}
          </div>}
          <div className="pharmacy-label-main"><strong>{draft.printable.title}</strong><span>{draft.printable.koreanName}</span><b className={hasDoseHighlight ? "dose-highlight" : ""}>{draft.printable.strength}</b>
            {draft.printable.reconstitution && <em>{draft.printable.reconstitution}</em>}</div>
          {draft.printable.footer.enabled && <footer>{draft.printable.footer.text}</footer>}
        </article> : <span className="empty">표시할 라벨이 없습니다.</span>}</div>
        <div className="pharmacy-warning-editor">{WARNING_OPTIONS.map((warning) => <label key={warning}><input type="checkbox" checked={draft?.warnings.includes(warning) ?? false} onChange={() => toggleWarning(warning)}/>{warning}</label>)}</div>
        {draft && <div className="pharmacy-type-editor"><strong>약품유형</strong>{[...new Set(rows.map((row) => row.drugType).filter(Boolean))].map((type) => <label key={type}><input type="checkbox" checked={draft.drugTypes.includes(type)} onChange={() => patch({ drugTypes: draft.drugTypes.includes(type) ? draft.drugTypes.filter((v) => v !== type) : [...draft.drugTypes, type] })}/>{type}</label>)}</div>}
        <div className="pharmacy-save-row"><span>{selectedDrafts.length ? `${pages.length}페이지 미리보기` : "출력할 약품을 선택하십시오."}</span><button className="secondary-button" disabled={!selectedDrafts.length} onClick={() => onPrint(selectedDrafts, paper)}><FileDown size={16}/>PDF 미리보기</button><button className="secondary-button" disabled={!selectedDrafts.length} onClick={() => onPrint(selectedDrafts, paper)}><Printer size={16}/>전체 출력</button><button className="print-button" disabled={!draft} onClick={() => draft && onSaveLabel(draft)}><Save size={16}/>수정라벨 저장</button></div>
      </section>

      <aside className="pharmacy-tool-panel">
        <details open><summary>크기 설정</summary><div className="pharmacy-tool-body pharmacy-size-grid">{sizeOptions.map((size) => <button key={size.presetKey} className={`pharmacy-size-preset ${draft?.size.presetKey === size.presetKey ? "active" : ""}`} onClick={() => patch({ size })}>{size.heightMm} × {size.widthMm} mm</button>)}</div></details>
        {["원병", "PTP"].includes(category) && <details open><summary>정제·부착 위치</summary><div className="pharmacy-tool-body pharmacy-choice-grid">{["0.25T", "0.5T", "1T"].map((value) => <button key={value} className={draft?.doseUnit === value ? "active" : ""} onClick={() => patch({ doseUnit: value as PharmacyLabelDraft["doseUnit"] })}>{value}</button>)}{["측면라벨", "병뚜껑", ...(family === "cabinet" ? ["선반라벨"] : [])].map((value) => <button key={value} className={draft?.accessory === value ? "active" : ""} onClick={() => patch({ accessory: value as PharmacyLabelDraft["accessory"] })}>{value}</button>)}</div></details>}
        <details open><summary>테두리 설정</summary><div className="pharmacy-tool-body"><label><input type="checkbox" checked={(draft?.style.outerBorderPx ?? 0) > 2} onChange={(e) => draft && patch({ style: {...draft.style, outerBorderPx: e.target.checked ? 5 : 2} })}/>테두리 있음</label><input type="color" value={draft?.style.outerBorderColor ?? "#111827"} onChange={(e) => draft && patch({style: {...draft.style, outerBorderColor: e.target.value}})}/></div></details>
        <details open><summary>표시 내용</summary><div className="pharmacy-tool-body"><label>상용약품명<textarea value={draft?.printable.title ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,title:e.target.value}})}/></label><label>한글약품명<input value={draft?.printable.koreanName ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,koreanName:e.target.value}})}/></label><label>용량<input value={draft?.printable.strength ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,strength:e.target.value}})}/></label>{category === "항암제" && <label>재구성·용해액(WI/NS)<input value={draft?.printable.reconstitution ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,reconstitution:e.target.value}})}/></label>}</div></details>
        <div className="pharmacy-paper-mini"><button className={paper === "A4" ? "active" : ""} onClick={() => setPaper("A4")}>A4</button><button className={paper === "A3" ? "active" : ""} onClick={() => setPaper("A3")}>A3</button></div>
      </aside>
    </section>
  </main>;
}
