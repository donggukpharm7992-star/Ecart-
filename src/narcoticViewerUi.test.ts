import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("narcotic viewer sync UI", () => {
  it("requires narcotic viewer edits to be explicitly applied to the admin PC", () => {
    expect(appSource).toContain("관리자 PC로 반영");
    expect(appSource).toContain('appMode === "admin"');
    expect(appSource).toContain("수정 내용은 관리자 PC로 반영 버튼을 눌러 저장하세요.");
  });
});
