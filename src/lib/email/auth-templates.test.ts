import { describe, expect, it } from "vitest";
import { buildAuthEmail } from "./auth-templates";

const link = "https://www.reemora.app/auth/confirm?token_hash=abc&type=recovery&next=%2Freset";

describe("buildAuthEmail", () => {
  it("brands the subject and carries the link in both languages", () => {
    const mail = buildAuthEmail("reset", { link, name: "Noor Hamada", siteUrl: "https://www.reemora.app" });
    expect(mail.subject).toMatch(/^Reemora/);
    expect(mail.subject).toContain("ريمورا");
    expect(mail.html.match(/token_hash=abc&amp;type=recovery/g)).toHaveLength(2);
    expect(mail.text).toContain(link);
    expect(mail.html).toContain("Hi Noor,");
    expect(mail.html).toContain("مرحباً Noor،");
  });

  it("escapes names so they can't inject markup", () => {
    const mail = buildAuthEmail("welcome", { link, name: "<b>x</b>", siteUrl: "https://www.reemora.app" });
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("greets without a name", () => {
    const mail = buildAuthEmail("welcome", { link, name: null, siteUrl: "https://www.reemora.app" });
    expect(mail.html).toContain("Hi,");
    expect(mail.subject).toContain("set your password");
  });
});
