import { describe, expect, it } from "vitest";
import { sameName } from "./registration-match";

describe("sameName", () => {
  it("treats a retry by the same person as the same name", () => {
    expect(sameName("Fatma Mirza", "fatma  mirza ")).toBe(true);
    expect(sameName("‏huda", "huda")).toBe(true);
    expect(sameName("دلال الكندري", "دلال  الكندري")).toBe(true);
  });

  it("keeps relatives or friends sharing an email apart", () => {
    expect(sameName("Fatma Mirza", "Sara Mirza")).toBe(false);
    expect(sameName("ايمان عيسى الكندري", "دلال الكندري")).toBe(false);
  });
});
