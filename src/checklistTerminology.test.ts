import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const cssSource = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("checklist terminology", () => {
  it("uses the improved checklist status label instead of the bad-defect wording", () => {
    expect(appSource).toContain('className="checklist-status-heading"');
    expect(appSource).toContain('aria-label="개선 필요"');
    expect(appSource).toContain("<span>개선</span>");
    expect(appSource).toContain("<span>필요</span>");
    expect(appSource).not.toContain("<th>개선 필요</th>");
    expect(appSource).toContain("개선 필요 체크와 비고/사유 입력 내용");
    expect(appSource).not.toContain("불량");
  });

  it("stacks the improved checklist status heading on two compact lines", () => {
    expect(cssSource).toMatch(/\.checklist-status-heading\s*\{[\s\S]*flex-direction:\s*column;/);
    expect(cssSource).toMatch(/\.checklist-status-heading\s*\{[\s\S]*line-height:\s*1\.08;/);
  });
});
