import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8");

function cssRule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
}

describe("hospital brand palette", () => {
  it("defines the sampled hospital palette colors", () => {
    expect(css).toContain("--brand-orange: #F68D45;");
    expect(css).toContain("--brand-orange-deep: #E2631A;");
    expect(css).toContain("--brand-taupe: #958A85;");
    expect(css).toContain("--brand-brown: #96796A;");
    expect(css).toContain("--brand-bluegray: #A8B6C3;");
    expect(css).toContain("--brand-yellow: #D5BC59;");
  });

  it("uses the hospital palette for header and core action controls", () => {
    expect(css).toMatch(/\.app-header\s*\{[\s\S]*background:\s*var\(--brand-header\);/);
    expect(css).toMatch(/\.admin-toggle,\s*[\s\S]*\.secondary-button\s*\{[\s\S]*background:\s*var\(--brand-orange\);/);
    expect(css).toMatch(/\.primary-tabs button\.active\.stock\s*\{[\s\S]*background:\s*var\(--brand-orange\);/);
    expect(css).toMatch(/\.primary-tabs button\.active\.ecart\s*\{[\s\S]*background:\s*var\(--brand-brown\);/);
    expect(css).toMatch(/\.master-excel-button\s*\{[\s\S]*background:\s*var\(--brand-brown\);/);
  });

  it("has size-specific long-name rules for fluid labels", () => {
    expect(css).toMatch(/\.drug-label-item\.label-size-55x95\.label-kind-fluid\.name-long\s+h3\s*\{[\s\S]*font-size:\s*40px;/);
    expect(css).toMatch(/\.drug-label-item\.label-size-10x70\.label-kind-fluid\.name-extra-long\s+h3\s*\{[\s\S]*font-size:\s*7\.6px;/);
  });

  it("removes vertical padding from 15x95 E-cart code stacks so the right black box fits the label height", () => {
    expect(cssRule(".drug-label-item.label-size-15x95.label-kind-ecart .drug-label-code-stack")).toMatch(/padding:\s*0 4px;/);
  });

  it("places compact narcotic cold storage text inside the right black code stack", () => {
    expect(cssRule(".label-code-storage")).toMatch(/color:\s*#fff;/);
    expect(cssRule(".drug-label-item .label-code-storage")).toMatch(/color:\s*#fff;/);

    for (const size of ["10x70", "15x95"]) {
      const stackRule = cssRule(`.drug-label-item.label-size-${size}.label-kind-narcotic .drug-label-code-stack`);
      const storageRule = cssRule(`.drug-label-item.label-size-${size}.label-kind-narcotic .label-code-storage.cold`);
      expect(stackRule).toMatch(/background:\s*#101010;/);
      expect(storageRule).toMatch(/font-size:/);
    }
  });

  it("uses a full-width footer band for 40x70 narcotic labels", () => {
    expect(cssRule(".drug-label-narcotic-footer")).toMatch(/background:\s*#6f1d1b;/);
    expect(cssRule(".drug-label-narcotic-footer")).toMatch(/color:\s*#fff;/);
    expect(cssRule(".drug-label-item.label-size-40x70.label-kind-narcotic .drug-label-code-stack")).toMatch(/display:\s*none;/);
  });
});
