import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./PharmacyLabelWorkspace.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("pharmacy label workspace upload UI", () => {
  it("shows the Excel upload control as a visible primary button next to drug list management", () => {
    expect(workspaceSource).toContain("약품리스트 관리");
    expect(workspaceSource).toContain('className="print-button pharmacy-upload-button"');
    expect(workspaceSource).toContain('aria-label="원내보유의약품리스트 엑셀 업로드"');
    expect(workspaceSource).toContain('accept=".xlsx,.xlsm"');
    expect(workspaceSource).toContain('"엑셀 업로드"');
  });

  it("allows the topbar action buttons to wrap instead of being pushed off screen", () => {
    expect(cssSource).toMatch(/\.pharmacy-studio-topbar\s*\{[\s\S]*grid-template-columns:\s*minmax\(180px,\s*0\.55fr\) minmax\(220px,\s*1fr\) minmax\(260px,\s*0\.9fr\)/);
    expect(cssSource).toMatch(/\.pharmacy-studio-actions\s*\{[\s\S]*min-width:\s*0;/);
    expect(cssSource).toMatch(/\.pharmacy-studio-actions\s*\{[\s\S]*justify-content:\s*flex-end;/);
  });
});
