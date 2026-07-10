import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  scripts?: Record<string, string>;
};
const releaseScript = readFileSync(new URL("../scripts/release_app.mjs", import.meta.url), "utf8");
const agents = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");

describe("release workflow", () => {
  it("provides one command that validates, deploys, and backs up source remotes", () => {
    expect(packageJson.scripts?.release).toBe("node scripts/release_app.mjs");
    expect(releaseScript).toContain('run("cmd.exe", ["/d", "/s", "/c", ["npm.cmd", ...args].join(" ")])');
    expect(releaseScript).toContain('runNpm(["test"])');
    expect(releaseScript).toContain('runNpm(["run", "publish"])');
    expect(releaseScript).toContain('pushRemote("origin", branch)');
    expect(releaseScript).toContain('pushRemote("backup", branch)');
  });

  it("records the automatic release rule for future app edits", () => {
    expect(agents).toContain("After any code, data, document, or asset change");
    expect(agents).toContain("run `npm run release`");
    expect(agents).toContain("origin and backup");
  });
});
