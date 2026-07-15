import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("narcotic viewer sync UI", () => {
  it("requires narcotic viewer edits to be explicitly applied to the admin PC", () => {
    expect(appSource).toContain("모바일 점검 내용 PC로 올리기");
    expect(appSource).toContain('appMode === "admin"');
    expect(appSource).toContain("수정 내용은 모바일 점검 내용 PC로 올리기 버튼을 눌러 저장하세요.");
  });

  it("lets the narcotic viewer explicitly load Excel-backed state from the PC", () => {
    expect(appSource).toContain("PC 엑셀 내용 불러오기");
    expect(appSource).toContain("pullNarcoticInspectionStateFromServer()");
  });

  it("shows explicit mobile-to-PC and PC-to-mobile actions in the admin screen", () => {
    expect(appSource).toContain("모바일 점검 내용 PC로 불러오기");
    expect(appSource).toContain("PC 엑셀 내용 모바일로 보내기");
  });
});
