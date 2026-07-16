import { ArrowLeft, ChevronDown, FileDown, Printer, Save, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { matchesHospitalDrugLabel, type HospitalDrugLabelRow } from "./hospitalDrugLabels";
import {
  A3_PAPER, A4_PAPER, CABINET_CATEGORIES, DRUG_CATEGORIES, WARNING_OPTIONS,
  groupPharmacyLabelsForPaper, resolvePharmacyLabelDraft, rowMatchesCategory, sizesForCategory,
  extractHex, formatPharmacyExpiry,
  splitDoseText,
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
  const [accessoryFilter, setAccessoryFilter] = useState<"" | "측면라벨" | "유색 측면라벨" | "병뚜껑">("");

  const baseCategoryRows = useMemo(
    () => rows.filter((row) => rowMatchesCategory(row, category, highCostRoute, family) && matchesHospitalDrugLabel(row, query)),
    [category, family, highCostRoute, query, rows],
  );
  const categoryRows = useMemo(() => baseCategoryRows.filter((row) => {
    if (accessoryFilter === "측면라벨") return Boolean(row.sideLabel1T || row.sideLabelHalfT || row.sideLabelQuarterT);
    if (accessoryFilter === "유색 측면라벨") return Boolean(row.coloredSideLabel);
    if (accessoryFilter === "병뚜껑") return Boolean(row.capLabel);
    return true;
  }), [accessoryFilter, baseCategoryRows]);
  const activeRow = categoryRows.find((row) => row.code === activeCode) ?? categoryRows[0];
  useEffect(() => {
    if (!activeRow) { setDraft(undefined); return; }
    setActiveCode(activeRow.code);
    const next = resolvePharmacyLabelDraft(activeRow, savedLabels, category, family);
    if (accessoryFilter === "병뚜껑") {
      next.accessory = "병뚜껑";
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "10x27") ?? next.size;
      next.backgroundColor = extractHex(activeRow.capBackground) || "#ffffff";
    } else if (accessoryFilter === "유색 측면라벨") {
      next.accessory = "유색 측면라벨";
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "23x102") ?? next.size;
      next.backgroundColor = extractHex(activeRow.coloredSideBackground) || "#ffffff";
    } else if (accessoryFilter === "측면라벨") {
      next.accessory = "측면라벨";
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "23x102") ?? next.size;
    }
    setDraft(next);
  }, [accessoryFilter, activeRow?.code, category, family, savedLabels]);

  const selectedDrafts = useMemo(
    () => categoryRows.filter((row) => selectedCodes.includes(row.code)).map((row) => {
      if (draft?.code === row.code) return draft;
      const next = resolvePharmacyLabelDraft(row, savedLabels, category, family);
      if (!draft) return next;
      next.size = draft.size;
      next.accessory = draft.accessory;
      next.style = { ...next.style, ...draft.style };
      if (draft.accessory === "유색 측면라벨") {
        next.backgroundColor = extractHex(row.coloredSideBackground) || draft.backgroundColor;
      }
      return next;
    }),
    [categoryRows, selectedCodes, draft, savedLabels, category, family],
  );
  const pages = groupPharmacyLabelsForPaper(selectedDrafts, paper === "A4" ? A4_PAPER : A3_PAPER);
  const allSelected = categoryRows.length > 0 && categoryRows.every((row) => selectedCodes.includes(row.code));
  const categoryGroups = family === "drug" ? DRUG_CATEGORIES : CABINET_CATEGORIES;
  const isCapLabel = draft?.accessory === "병뚜껑";
  const isColoredSideLabel = draft?.accessory === "유색 측면라벨";
  const isSideLabel = draft?.accessory === "측면라벨" || isColoredSideLabel;
  const isExternalShelfLabel = ["외용제", "외용점안제", "팩제", "시럽"].includes(category) && draft?.size.presetKey === "13.5x105";
  const sizeOptions = family === "cabinet" && draft
    ? [draft.size]
    : sizesForCategory(category, activeRow).filter((size) =>
        category !== "원병" ? true : isCapLabel ? ["10x27", "15x30"].includes(size.presetKey) : !["10x27", "15x30"].includes(size.presetKey),
      );
  const hasDoseHighlight = draft?.warnings.some((warning) => warning === "용량주의" || warning === "용량확인") ?? false;
  const hasCautionWarning = draft?.warnings.some((warning) => ["용량주의", "용량확인", "유사발음", "유사모양", "이름주의", "고위험의약품"].includes(warning)) ?? false;
  const hasColdWarning = draft?.warnings.includes("냉장") ?? false;
  const hasLightWarning = draft?.warnings.includes("차광") ?? false;
  const storageOnlyClass = !hasCautionWarning && hasColdWarning && hasLightWarning
    ? "storage-light-cold"
    : !hasCautionWarning && hasColdWarning
      ? "storage-cold"
      : !hasCautionWarning && hasLightWarning
        ? "storage-light"
        : "";
  const externalTone = hasCautionWarning ? "#d92d20" : hasColdWarning ? "#155eef" : hasLightWarning ? "#16803c" : draft?.style.outerBorderColor ?? "#111827";
  const storageToneClass = hasLightWarning ? "storage-tone-light" : hasColdWarning ? "storage-tone-cold" : "";

  function patch(patchValue: Partial<PharmacyLabelDraft>) {
    setDraft((current) => current ? { ...current, ...patchValue } : current);
  }
  function setCategoryAndReset(next: PharmacyLabelCategory) {
    setCategory(next); setSelectedCodes([]); setActiveCode(""); setAccessoryFilter("");
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
    "--pharmacy-label-border": `${draft.accessory === "측면라벨" || draft.accessory === "유색 측면라벨" ? "1px solid #111827" : draft.style.outerBorderPx <= 0 ? "none" : `${draft.style.outerBorderPx >= 5 ? "5mm" : `${draft.style.outerBorderPx}px`} solid ${draft.style.outerBorderColor}`}`,
    "--pharmacy-label-font-size": `${draft.style.fontSizePt}pt`,
    "--pharmacy-label-color": draft.style.fontColor,
    "--pharmacy-label-warning": draft.style.warningColor,
    "--pharmacy-label-background": isColoredSideLabel || isCapLabel ? draft.backgroundColor : "#ffffff",
    "--pharmacy-external-tone": externalTone,
  } as CSSProperties) : undefined;
  const displayTitle = isCapLabel ? draft?.printable.title.replace(/\btab(?:let)?\b/gi, "").replace(/\s{2,}/g, " ").trim() ?? "" : draft?.printable.title ?? "";
  const titleSizeClass = displayTitle.length > 34 ? "very-long-name" : displayTitle.length > 25 ? "long-name" : displayTitle.length > 16 ? "medium-name" : "";
  const titleParts = splitDoseText(displayTitle);
  const imageUrl = draft?.imagePath
    ? `${import.meta.env.BASE_URL}${draft.imagePath.replace(/^\.?\//, "")}`
    : "";

  function chooseAccessory(value: PharmacyLabelDraft["accessory"]) {
    if (!draft || !value) return;
    const next: Partial<PharmacyLabelDraft> = { accessory: value };
    if (value === "병뚜껑") {
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "10x27") ?? draft.size;
      next.backgroundColor = isColoredSideLabel || accessoryFilter === "유색 측면라벨"
        ? extractHex(activeRow?.coloredSideBackground) || draft.backgroundColor
        : extractHex(activeRow?.capBackground) || "#ffffff";
    } else if (value === "유색 측면라벨") {
      setAccessoryFilter("유색 측면라벨");
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "23x102") ?? draft.size;
      next.backgroundColor = extractHex(activeRow?.coloredSideBackground) || "#ffffff";
    } else if (value === "측면라벨") {
      next.size = sizesForCategory("원병", activeRow).find((size) => size.presetKey === "23x102") ?? draft.size;
      next.backgroundColor = "#ffffff";
    } else {
      next.backgroundColor = "#ffffff";
    }
    patch(next);
  }

  return <main className="pharmacy-label-studio">
    <header className="pharmacy-studio-topbar">
      <div><p>원내보유의약품리스트 기준</p><h1>약제팀 라벨 작업실</h1></div>
      <label className="pharmacy-studio-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="약품코드, 물품코드, 약품명 검색"/></label>
      <div className="pharmacy-studio-actions">
        <label className="print-button pharmacy-upload-button" title="동국대학교일산병원_매출_날짜 엑셀 파일"><Upload size={16}/>유효기간 파일 업데이트<input className="hidden-file-input" type="file" accept=".xlsx,.xls,.xlsm" onChange={upload}/></label>
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
        {["원병", "PTP"].includes(category) && <div className="pharmacy-accessory-filters" aria-label="부착 라벨 표시 약품">
          <strong>표시 약품 먼저 보기</strong>
          {(["", "측면라벨", "유색 측면라벨", "병뚜껑"] as const).map((value) => <button key={value || "전체"} className={accessoryFilter === value ? "active" : ""} onClick={() => { setAccessoryFilter(value); setSelectedCodes([]); setActiveCode(""); }}>{value || "전체"}</button>)}
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
            <button type="button" onClick={() => { setActiveCode(row.code); setSelectedCodes((previous) => previous.includes(row.code) ? previous : [...previous, row.code]); }}><strong>{row.name}</strong><small>{row.koreanName} · {row.code} · {row.strength}</small></button>
          </label>)}
        </div>
      </aside>

      <section className="pharmacy-label-canvas-panel">
        <div className="pharmacy-panel-head"><div><h2>라벨 편집 캔버스</h2><p>선택한 라벨을 편집한 뒤 최종본으로 저장합니다.</p></div></div>
        <div className="pharmacy-edit-modes"><button className={editMode === "edit" ? "active" : ""} onClick={() => setEditMode("edit")}>선택 라벨 수정</button><button className={editMode === "new" ? "active" : ""} onClick={() => setEditMode("new")}>새 라벨 만들기</button>{draft && <div className="pharmacy-inline-border-choice"><span>테두리</span><button className={draft.style.outerBorderPx > 0 ? "active" : ""} onClick={() => patch({ style: {...draft.style, outerBorderPx: 5} })}>있음</button><button className={draft.style.outerBorderPx <= 0 ? "active" : ""} onClick={() => patch({ style: {...draft.style, outerBorderPx: 0} })}>없음</button></div>}</div>
        {editMode === "new" && draft && <div className="pharmacy-new-label-fields">
          <input placeholder="상용약품명" value={draft.printable.title} onChange={(e) => patch({ printable: {...draft.printable, title: e.target.value} })}/>
          <input placeholder="한글약품명" value={draft.printable.koreanName} onChange={(e) => patch({ printable: {...draft.printable, koreanName: e.target.value} })}/>
          <input placeholder="약품코드" value={draft.code} onChange={(e) => patch({ code: e.target.value })}/><input placeholder="물품코드" value={draft.itemCode} onChange={(e) => patch({ itemCode: e.target.value })}/>
          <input placeholder="약품 위치" value={draft.location} onChange={(e) => patch({ location: e.target.value })}/>
          <input placeholder="ATC 번호" value={draft.atc} onChange={(e) => patch({ atc: e.target.value })}/>
        </div>}
        <div className="pharmacy-label-canvas">{draft ? <article className={`pharmacy-print-label label-size-${draft.size.presetKey} ${category === "항암제" ? "anticancer" : ""} ${category === "고가약" ? "high-cost" : ""} ${storageOnlyClass} ${storageToneClass} ${isCapLabel ? "cap-label" : ""} ${isSideLabel ? "side-label" : ""} ${isExternalShelfLabel ? "external-shelf-label" : ""} ${category === "시럽" ? "syrup-label" : ""} ${category === "영양수액" ? "nutrition-fluid-label" : ""} ${!draft.printable.topBanner && !hasCautionWarning ? "no-top-banner" : ""} ${!draft.printable.warning && !draft.printable.topBanner ? "no-warning" : ""}`} style={labelStyle}>
          {isSideLabel ? <div className="pharmacy-side-label-form">
            <div className="pharmacy-side-label-photo">{imageUrl
              ? <a href={draft.imageSourceUrl} target="_blank" rel="noreferrer" title="약학정보원 식별사진 검색"><img src={imageUrl} alt={`${draft.printable.koreanName} 식별사진`}/></a>
              : <a href={draft.imageSourceUrl} target="_blank" rel="noreferrer">사진 확인</a>}</div>
            <div className="pharmacy-side-label-name">
              <div className="pharmacy-side-label-name-core"><strong>{draft.printable.title}</strong>
              <span>({draft.printable.koreanName})</span>
              {draft.doseUnit && draft.doseUnit !== "1T" && <b>{draft.doseUnit}</b>}</div>
              {draft.warnings.length > 0 && <small>{draft.warnings.join(" · ")}</small>}
            </div>
            <div className="pharmacy-side-label-meta">
              <strong>{draft.atc ? `${draft.atc}번` : "-"}</strong>
              <span>유효기간</span>
              <b>{formatPharmacyExpiry(activeRow?.expiry || draft.expiry || draft.printable.footer.text) || "YYYY-MM-DD"}</b>
            </div>
          </div> : family === "cabinet" ? <div className={`pharmacy-cabinet-list-row ${category === "냉장주사" ? "with-storage-column" : ""}`}>
            <div><strong>{draft.printable.title}</strong>{draft.printable.koreanName && <span>{draft.printable.koreanName}</span>}</div>
            <b>{draft.warnings.filter((warning) => !["냉장", "차광"].includes(warning)).join(" · ") || "-"}</b>
            {category === "냉장주사" && <em>{draft.location || "-"}</em>}
          </div> : category === "영양수액" ? <div className="pharmacy-nutrition-label">
            <aside>{draft.warnings.filter((warning) => !["냉장", "차광"].includes(warning)).join(" · ")}{hasLightWarning && <b className="nutrition-storage-dot light">차광</b>}{!hasLightWarning && hasColdWarning && <b className="nutrition-storage-dot cold">냉장</b>}</aside>
            <strong className={titleSizeClass}>{hasDoseHighlight && titleParts.dose ? <>{titleParts.before}<mark className="dose-highlight">{titleParts.dose}</mark>{titleParts.after}</> : draft.printable.title}</strong>
            <aside>{draft.warnings.filter((warning) => !["냉장", "차광"].includes(warning)).join(" · ")}</aside>
          </div> : <>
          {!isCapLabel && !isExternalShelfLabel && (draft.printable.topBanner || (hasCautionWarning && category !== "항암제")) && <div className="pharmacy-label-top-banner">
            <span>{[draft.printable.topBanner, category !== "항암제" ? draft.warnings.filter((warning) => !["냉장", "차광"].includes(warning)).join(" · ") : ""].filter(Boolean).join(" · ")}</span>
            {hasLightWarning && <b className="pharmacy-storage-badge light">차광</b>}
            {hasColdWarning && <b className="pharmacy-storage-badge cold">냉장</b>}
          </div>}
          {!hasCautionWarning && hasColdWarning && hasLightWarning && <b className="pharmacy-storage-circle cold">냉장</b>}
          <div className="pharmacy-label-main"><strong className={titleSizeClass}>
            {hasDoseHighlight && titleParts.dose ? <>{titleParts.before}<mark className="dose-highlight">{titleParts.dose}</mark>{titleParts.after}</> : displayTitle}
          </strong>
            {!isCapLabel && !isExternalShelfLabel && <span>{draft.printable.koreanName}</span>}
            {isCapLabel && draft.doseUnit && draft.doseUnit !== "1T" && <b>{draft.doseUnit}</b>}
            {!isCapLabel && !isExternalShelfLabel && draft.atc && <small className="pharmacy-label-atc">ATC {draft.atc}</small>}
            {!isCapLabel && !isExternalShelfLabel && draft.location && <small className="pharmacy-label-location">{draft.location}</small>}
            {!isExternalShelfLabel && draft.printable.reconstitution && <em>{draft.printable.reconstitution}</em>}</div>
          {!isExternalShelfLabel && draft.printable.footer.enabled && <footer className={category === "항암제" ? "anticancer-footer" : ""}>{category === "항암제" ? "항암제" : draft.printable.footer.text}</footer>}
          </>}
        </article> : <span className="empty">표시할 라벨이 없습니다.</span>}</div>
        <section className="pharmacy-condition-dashboard">
          <div><h3>주의·보관 조건</h3><div className="pharmacy-warning-editor">{WARNING_OPTIONS.map((warning) => <label className={draft?.warnings.includes(warning) ? "checked" : ""} key={warning}><input type="checkbox" checked={draft?.warnings.includes(warning) ?? false} onChange={() => toggleWarning(warning)}/><span>{warning}</span></label>)}</div></div>
          {draft && <div><h3>약품유형</h3><div className="pharmacy-type-editor">{[...new Set(rows.map((row) => row.drugType).filter((type) => type && !["36", "99", "종료예정"].includes(type.trim())))].map((type) => <label className={draft.drugTypes.includes(type) ? "checked" : ""} key={type}><input type="checkbox" checked={draft.drugTypes.includes(type)} onChange={() => patch({ drugTypes: draft.drugTypes.includes(type) ? draft.drugTypes.filter((v) => v !== type) : [...draft.drugTypes, type] })}/><span>{type}</span></label>)}</div></div>}
        </section>
        <div className="pharmacy-save-row"><span>{selectedDrafts.length ? `${pages.length}페이지 미리보기` : "출력할 약품을 선택하십시오."}</span><div className="pharmacy-paper-mini"><button type="button" className={paper === "A4" ? "active" : ""} onClick={() => setPaper("A4")}>A4</button><button type="button" className={paper === "A3" ? "active" : ""} onClick={() => setPaper("A3")}>A3</button></div><button type="button" className="secondary-button" disabled={!selectedDrafts.length} onClick={() => onPrint(selectedDrafts, paper)}><FileDown size={16}/>PDF 미리보기</button><button type="button" className="secondary-button" disabled={!selectedDrafts.length} onClick={() => onPrint(selectedDrafts, paper)}><Printer size={16}/>전체 출력</button><button type="button" className="print-button" disabled={!draft} onClick={() => draft && onSaveLabel(draft)}><Save size={16}/>수정라벨 저장</button></div>
      </section>

      <aside className="pharmacy-tool-panel">
        <details open><summary>크기 설정</summary><div className="pharmacy-tool-body pharmacy-size-grid">{sizeOptions.map((size) => <button key={size.presetKey} className={`pharmacy-size-preset ${draft?.size.presetKey === size.presetKey ? "active" : ""}`} onClick={() => patch({ size })}>{size.heightMm} × {size.widthMm} mm</button>)}</div></details>
        {["원병", "PTP"].includes(category) && <details open><summary>정제·부착 위치</summary><div className="pharmacy-tool-body pharmacy-choice-grid">{["0.25T", "0.5T", "1T"].map((value) => <button key={value} className={draft?.doseUnit === value ? "active" : ""} onClick={() => patch({ doseUnit: value as PharmacyLabelDraft["doseUnit"] })}>{value}</button>)}{["측면라벨", ...(activeRow?.coloredSideLabel ? ["유색 측면라벨"] : []), "병뚜껑", ...(family === "cabinet" ? ["선반라벨"] : [])].map((value) => <button key={value} className={draft?.accessory === value ? "active" : ""} onClick={() => chooseAccessory(value as PharmacyLabelDraft["accessory"])}>{value}</button>)}</div></details>}
        <details open><summary>테두리 설정</summary><div className="pharmacy-tool-body"><label><input type="checkbox" checked={(draft?.style.outerBorderPx ?? 0) > 0} onChange={(e) => draft && patch({ style: {...draft.style, outerBorderPx: e.target.checked ? 5 : 0} })}/>테두리 있음</label><input type="color" value={draft?.style.outerBorderColor ?? "#111827"} onChange={(e) => draft && patch({style: {...draft.style, outerBorderColor: e.target.value}})}/></div></details>
        <details open><summary>표시 내용</summary><div className="pharmacy-tool-body"><label>상용약품명<textarea value={draft?.printable.title ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,title:e.target.value}})}/></label><label>한글약품명<input value={draft?.printable.koreanName ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,koreanName:e.target.value}})}/></label><label>용량<input value={draft?.printable.strength ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,strength:e.target.value}})}/></label><label>약품 위치<input value={draft?.location ?? ""} onChange={(e) => patch({location:e.target.value})}/></label><label>ATC 번호<input value={draft?.atc ?? ""} onChange={(e) => patch({atc:e.target.value})}/></label>{category === "항암제" && <label>재구성·용해액(WI/NS)<input value={draft?.printable.reconstitution ?? ""} onChange={(e) => draft && patch({printable:{...draft.printable,reconstitution:e.target.value}})}/></label>}</div></details>
      </aside>
    </section>
  </main>;
}
