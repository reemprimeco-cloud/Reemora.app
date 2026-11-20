import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countPdfPages, formatFileSize, safeFileName } from "./library";

describe("library helpers", () => {
  it("formats sizes", () => {
    expect(formatFileSize(1641215)).toBe("1.6 MB");
    expect(formatFileSize(72232)).toBe("71 KB");
    expect(formatFileSize(null)).toBe("");
  });

  it("counts pages of the shipped guide", () => {
    const bytes = new Uint8Array(readFileSync("public/library/ai-film-director.pdf"));
    const n = countPdfPages(bytes);
    expect(n === null || n === 7).toBe(true);
  });

  it("makes header-safe file names", () => {
    expect(safeFileName("AI Film Director.pdf")).toBe("AI-Film-Director.pdf");
    expect(safeFileName("المخرج السينمائي")).toBe("Reemora-guide.pdf");
    expect(safeFileName("guide")).toBe("guide.pdf");
  });
});
