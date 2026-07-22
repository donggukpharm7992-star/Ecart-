import { describe, expect, it } from "vitest";
import { storageDisplayLabel } from "./storageDisplay";

describe("storageDisplayLabel", () => {
  it("treats storage at or below 25℃ as room temperature", () => {
    expect(
      storageDisplayLabel({
        code: "TEST-25",
        productName: "Test drug",
        storage: "밀봉용기, 25℃이하 보관",
        storageType: "REFRIGERATED",
      }),
    ).toBe("실온");
  });
});
