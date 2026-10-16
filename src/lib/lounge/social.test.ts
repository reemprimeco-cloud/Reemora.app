import { describe, expect, it } from "vitest";
import { normalizeLink, handleOf, editableValue, linkLabel, isSafeHttpUrl } from "./social";

describe("normalizeLink", () => {
  it("turns bare handles into canonical profile URLs", () => {
    expect(normalizeLink("instagram", "prime_kw")).toBe("https://instagram.com/prime_kw");
    expect(normalizeLink("instagram", "@prime_kw")).toBe("https://instagram.com/prime_kw");
    expect(normalizeLink("x", "reem")).toBe("https://x.com/reem");
    expect(normalizeLink("youtube", "reemora")).toBe("https://youtube.com/@reemora");
    expect(normalizeLink("linkedin", "reem-alx")).toBe("https://linkedin.com/in/reem-alx");
    expect(normalizeLink("github", "reemprimeco-cloud")).toBe("https://github.com/reemprimeco-cloud");
  });

  it("accepts bare domains and full URLs", () => {
    expect(normalizeLink("website", "reemora.app")).toBe("https://reemora.app");
    expect(normalizeLink("website", "https://www.reemora.app")).toBe("https://www.reemora.app");
    expect(normalizeLink("other", "example.com/me")).toBe("https://example.com/me");
    expect(normalizeLink("instagram", "www.instagram.com/prime_kw/")).toBe("https://www.instagram.com/prime_kw/");
  });

  it("rejects anything that could become a dangerous href", () => {
    expect(normalizeLink("website", "javascript:alert(1)")).toBeNull();
    expect(normalizeLink("other", "data:text/html,hi")).toBeNull();
    expect(normalizeLink("website", "not a url")).toBeNull();
    expect(normalizeLink("instagram", "bad handle!")).toBeNull();
    expect(normalizeLink("instagram", "x".repeat(301))).toBeNull();
  });

  it("treats empty input as cleared, not invalid", () => {
    expect(normalizeLink("instagram", "")).toBe("");
    expect(normalizeLink("website", "   ")).toBe("");
  });
});

describe("handleOf / editableValue / linkLabel", () => {
  it("recovers the handle from stored URLs, including www and trailing slashes", () => {
    expect(handleOf("instagram", "https://www.instagram.com/prime_kw/")).toBe("@prime_kw");
    expect(handleOf("x", "https://twitter.com/reem")).toBe("@reem");
    expect(handleOf("linkedin", "https://www.linkedin.com/in/reem-alx/")).toBe("@reem-alx");
    expect(handleOf("youtube", "https://youtube.com/@reemora")).toBe("@reemora");
    expect(handleOf("instagram", "https://example.com/prime_kw")).toBeNull();
  });

  it("shows the bare handle in the editor and @handle on the profile", () => {
    expect(editableValue("instagram", "https://instagram.com/prime_kw")).toBe("prime_kw");
    expect(editableValue("website", "https://reemora.app")).toBe("reemora.app");
    expect(linkLabel("instagram", "https://instagram.com/prime_kw")).toBe("@prime_kw");
    expect(linkLabel("website", "https://www.reemora.app")).toBe("reemora.app");
  });
});

describe("isSafeHttpUrl", () => {
  it("only allows absolute http(s) URLs with a host", () => {
    expect(isSafeHttpUrl("https://reemora.app")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:3000")).toBe(true);
    expect(isSafeHttpUrl("ftp://reemora.app")).toBe(false);
    expect(isSafeHttpUrl("//reemora.app")).toBe(false);
    expect(isSafeHttpUrl("javascript:void(0)")).toBe(false);
  });
});
