import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("drug label selection UI", () => {
  it("uses a real checkbox tied to each drug label row selection state", () => {
    expect(appSource).toContain('className="label-drug-checkbox"');
    expect(appSource).toContain('type="checkbox"');
    expect(appSource).toContain("checked={selected}");
    expect(appSource).toContain("aria-label={`${row.name} 라벨 선택`}");
  });

  it("offers a top select-all checkbox for the currently visible label rows", () => {
    expect(appSource).toContain("function toggleCurrentLabelRows(checked: boolean)");
    expect(appSource).toContain("const areCurrentLabelRowsSelected =");
    expect(appSource).toContain('className={`label-drug-list-row label-drug-select-all ${areCurrentLabelRowsSelected ? "selected" : ""}`}');
    expect(appSource).toContain('aria-label="현재 목록 전체 라벨 선택"');
    expect(appSource).toContain("onChange={(event) => toggleCurrentLabelRows(event.currentTarget.checked)}");
  });

  it("reserves a compact first column for the label selection checkbox", () => {
    expect(cssSource).toMatch(/\.label-drug-list-row\s*\{[\s\S]*grid-template-columns:\s*auto auto minmax\(0, 1fr\)/);
    expect(cssSource).toMatch(/\.label-drug-checkbox input\s*\{[\s\S]*width:\s*18px;/);
  });

  it("visually separates the select-all row from individual drug rows", () => {
    expect(cssSource).toMatch(/\.label-drug-select-all\s*\{[\s\S]*position:\s*sticky;/);
    expect(cssSource).toMatch(/\.label-drug-select-all\s*\{[\s\S]*background:\s*#fbfaf9;/);
  });

  it("routes 40x70 narcotic labels to hospital controlled common names", () => {
    expect(appSource).toContain('if (labelMode === "narcotic") return labelSize === "40x70" ? hospitalControlledLabelRows : narcoticMasterLabelRows;');
    expect(appSource).toContain("stripHospitalDrugControlledPrefix(row.name)");
    expect(appSource).toContain("makeHospitalControlledDrugLabelId(row)");
  });

  it("uses dose confirmation wording on 40x70 narcotic labels", () => {
    expect(appSource).toContain('const FORTY_NARCOTIC_DOSE_CONFIRM_LABEL = "\\uc6a9\\ub7c9\\ud655\\uc778";');
    expect(appSource).toContain("FORTY_NARCOTIC_DOSE_CONFIRM_LABEL");
  });
});
