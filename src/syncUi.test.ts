import { describe, expect, it } from "vitest";
import { getSyncActionAvailability, getSyncDeviceMode } from "./syncUi";

describe("sync UI mode", () => {
  it("treats the explicit mobile view and narrow screens as mobile sync devices", () => {
    expect(getSyncDeviceMode({ isMobileMode: true, viewportWidth: 1280 })).toBe("mobile");
    expect(getSyncDeviceMode({ isMobileMode: false, viewportWidth: 640 })).toBe("mobile");
    expect(getSyncDeviceMode({ isMobileMode: false, viewportWidth: 1024 })).toBe("pc");
  });

  it("shows upload only on mobile and remote pull only on PC", () => {
    expect(getSyncActionAvailability({ mode: "mobile", hasToken: true })).toEqual({
      showPull: false,
      showPush: true,
      canPull: false,
      canPush: true,
    });
    expect(getSyncActionAvailability({ mode: "pc", hasToken: true })).toEqual({
      showPull: true,
      showPush: false,
      canPull: true,
      canPush: false,
    });
  });

  it("keeps the visible action disabled until sync is configured", () => {
    expect(getSyncActionAvailability({ mode: "mobile", hasToken: false }).canPush).toBe(false);
    expect(getSyncActionAvailability({ mode: "pc", hasToken: false }).canPull).toBe(false);
  });

  it("enables the visible action when a token has been typed but not saved yet", () => {
    expect(getSyncActionAvailability({ mode: "mobile", hasToken: true }).canPush).toBe(true);
    expect(getSyncActionAvailability({ mode: "pc", hasToken: true }).canPull).toBe(true);
  });
});
