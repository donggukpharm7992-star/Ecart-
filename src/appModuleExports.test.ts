import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("App module exports", () => {
  it("keeps non-component test helpers out of App.tsx so Fast Refresh stays stable", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const exportedFunctions = [...appSource.matchAll(/^export function\s+([A-Za-z0-9_]+)/gm)].map((match) => match[1]);

    expect(exportedFunctions.filter((name) => name !== "App")).toEqual([]);
  });
});
