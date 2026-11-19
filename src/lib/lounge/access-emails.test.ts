import { describe, expect, it } from "vitest";
import { needsAccessEmail } from "./access-emails";

const now = Date.parse("2026-11-19T20:00:00Z");
const base = { user_id: "u1", has_access: false, recovery_sent_at: null };

describe("needsAccessEmail", () => {
  it("emails approved members who never really got in", () => {
    expect(needsAccessEmail(base, { isAdmin: false, now })).toBe(true);
  });
  it("skips members who already have access, and admins", () => {
    expect(needsAccessEmail({ ...base, has_access: true }, { isAdmin: false, now })).toBe(false);
    expect(needsAccessEmail(base, { isAdmin: true, now })).toBe(false);
  });
  it("skips anyone sent a link in the last 10 minutes, not older ones", () => {
    expect(needsAccessEmail({ ...base, recovery_sent_at: "2026-11-19T19:55:00Z" }, { isAdmin: false, now })).toBe(false);
    expect(needsAccessEmail({ ...base, recovery_sent_at: "2026-11-19T19:40:00Z" }, { isAdmin: false, now })).toBe(true);
  });
});
