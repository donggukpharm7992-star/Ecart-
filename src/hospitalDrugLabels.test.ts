import { describe, expect, it } from "vitest";
import {
  getHospitalDrugLabelWarnings,
  getHospitalDrugStorageLabel,
  isHospitalDrugLightProtected,
  loadHospitalDrugLabelRows,
  matchesHospitalDrugLabel,
} from "./hospitalDrugLabels";

describe("hospital drug label source", () => {
  it("loads all drug label candidates from the hospital drug workbook", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");
    const albumin = rows.find((row) => row.code === "X20AL1S");

    expect(rows.length).toBeGreaterThan(2700);
    expect(abilify?.name).toBe("Abilify asimtufii 720mg inj");
    expect(albumin?.name).toBe("Albumin(SK) 20% 100ml inj");
  });

  it("uses workbook storage, light protection, and caution columns for labels", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");
    const albumin = rows.find((row) => row.code === "X20AL1S");

    expect(abilify && isHospitalDrugLightProtected(abilify)).toBe(true);
    expect(abilify && getHospitalDrugStorageLabel(abilify)).toBe("차광");
    expect(albumin && getHospitalDrugLabelWarnings(albumin)).toContain("용량주의");
  });

  it("matches hospital label rows by English name, Korean name, and code", async () => {
    const rows = await loadHospitalDrugLabelRows();
    const abilify = rows.find((row) => row.code === "XXARPIP72");

    expect(abilify && matchesHospitalDrugLabel(abilify, "asimtufii")).toBe(true);
    expect(abilify && matchesHospitalDrugLabel(abilify, "아심투파이")).toBe(true);
    expect(abilify && matchesHospitalDrugLabel(abilify, "XXARPIP72")).toBe(true);
  });
});
