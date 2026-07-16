import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(new URL("./PharmacyLabelWorkspace.tsx", import.meta.url), "utf8");

describe("pharmacy label workspace UI", () => {
  it("provides two collapsible label families and detailed categories", () => {
    expect(workspaceSource).toContain("약품 라벨");
    expect(workspaceSource).toContain("약품장 라벨");
    expect(workspaceSource).toContain("상세 선택");
    expect(workspaceSource).toContain("DRUG_CATEGORIES");
    expect(workspaceSource).toContain("CABINET_CATEGORIES");
  });

  it("provides selection, PDF preview, editing, and workbook upload controls", () => {
    expect(workspaceSource).toContain("전체 선택");
    expect(workspaceSource).toContain("PDF 미리보기");
    expect(workspaceSource).toContain("수정라벨 저장");
    expect(workspaceSource).toContain("새 라벨 만들기");
    expect(workspaceSource).toContain("유효기간 파일 업데이트");
  });

  it("applies dose and storage conditions to the label canvas", () => {
    expect(workspaceSource).toContain("dose-highlight");
    expect(workspaceSource).toContain("pharmacy-storage-badge light");
    expect(workspaceSource).toContain("pharmacy-storage-badge cold");
    expect(workspaceSource).toContain("storageOnlyClass");
  });

  it("removes non-drug status values from the drug type selector", () => {
    expect(workspaceSource).toContain('!["36", "99", "종료예정"].includes(type.trim())');
  });

  it("provides colored side labels, location, and ATC editing", () => {
    expect(workspaceSource).toContain("유색 측면라벨");
    expect(workspaceSource).toContain("약품 위치");
    expect(workspaceSource).toContain("ATC 번호");
  });
});
