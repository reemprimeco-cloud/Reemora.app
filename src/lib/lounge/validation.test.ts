import { describe, expect, it } from "vitest";
import { profileSchema, chatSchema, commentSchema, postSchema, reportSchema } from "./validation";

const baseProfile = { displayName: "Reem", bio: "", skills: "React, Supabase", websiteUrl: "", socialLinks: {}, showEmail: false, showPhone: false, avatarUrl: "" };

describe("profileSchema", () => {
  it("normalises handles and bare domains into https links", () => {
    const out = profileSchema.parse({ ...baseProfile, websiteUrl: "reemora.app", socialLinks: { instagram: "prime_kw", x: "" } });
    expect(out.websiteUrl).toBe("https://reemora.app");
    expect(out.socialLinks).toEqual({ instagram: "https://instagram.com/prime_kw" });
    expect(out.skills).toEqual(["React", "Supabase"]);
  });

  it("rejects script URLs and over-long names", () => {
    expect(profileSchema.safeParse({ ...baseProfile, websiteUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...baseProfile, socialLinks: { other: "data:text/html,x" } }).success).toBe(false);
    expect(profileSchema.safeParse({ ...baseProfile, displayName: "R" }).success).toBe(false);
  });

  it("caps and de-duplicates skills", () => {
    const out = profileSchema.parse({ ...baseProfile, skills: "a, A, b, b, c" });
    expect(out.skills).toEqual(["a", "b", "c"]);
  });
});

describe("chatSchema", () => {
  const attachment = { url: "https://x.supabase.co/storage/v1/object/public/lounge-files/u/f.pdf", type: "file", name: "f.pdf", size: 1000 };

  it("allows text only, attachment only, or both", () => {
    expect(chatSchema.safeParse({ body: "hi" }).success).toBe(true);
    expect(chatSchema.safeParse({ body: "", attachment }).success).toBe(true);
    expect(chatSchema.safeParse({ attachment }).success).toBe(true);
  });

  it("rejects an empty message and oversized or unsafe attachments", () => {
    expect(chatSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(chatSchema.safeParse({ body: "x", attachment: { ...attachment, size: 11 * 1024 * 1024 } }).success).toBe(false);
    expect(chatSchema.safeParse({ body: "x", attachment: { ...attachment, url: "javascript:alert(1)" } }).success).toBe(false);
    expect(chatSchema.safeParse({ body: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("commentSchema", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("accepts the fixed feedback categories only", () => {
    expect(commentSchema.safeParse({ postId: id, body: "Nice", category: "like" }).success).toBe(true);
    expect(commentSchema.safeParse({ postId: id, body: "Nice", category: null }).success).toBe(true);
    expect(commentSchema.safeParse({ postId: id, body: "Nice", category: "spam" }).success).toBe(false);
    expect(commentSchema.safeParse({ postId: "nope", body: "Nice" }).success).toBe(false);
  });
});

describe("postSchema", () => {
  it("requires a link for project posts", () => {
    const base = { type: "project", title: "My app", body: "What it does", galleryUrls: [] };
    expect(postSchema.safeParse(base).success).toBe(false);
    expect(postSchema.safeParse({ ...base, projectUrl: "https://shlon.app" }).success).toBe(true);
    expect(postSchema.safeParse({ ...base, type: "discussion" }).success).toBe(true);
  });
});

describe("reportSchema", () => {
  it("needs a real reason", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(reportSchema.safeParse({ targetType: "post", targetId: id, reason: "no" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "member", targetId: id, reason: "Harassment in chat" }).success).toBe(true);
  });
});
