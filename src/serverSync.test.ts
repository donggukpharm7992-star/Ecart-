import { describe, expect, it } from "vitest";
import { buildAppStateApiUrl } from "./serverSync";

describe("server sync client", () => {
  it("builds the local app-state API URL under the Vite base path", () => {
    expect(buildAppStateApiUrl("/Ecart-/")).toBe("/Ecart-/api/app-state");
    expect(buildAppStateApiUrl("/")).toBe("/api/app-state");
  });
});
