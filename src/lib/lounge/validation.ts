import { z } from "zod";

import { isSafeHttpUrl, normalizeLink, SOCIAL_KEYS, type SocialKey } from "@/lib/lounge/social";

/** Only absolute http(s) links are accepted anywhere a member can paste a
 *  URL — this rules out javascript:, data: and protocol-relative values
 *  before they ever reach an <a href>. Re-exported from social.ts. */
export { isSafeHttpUrl, SOCIAL_KEYS, type SocialKey };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;

const trimmed = (max: number, min = 0) => z.string().trim().min(min).max(max);

export const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || isSafeHttpUrl(v), "Invalid URL")
  .transform((v) => (v === "" ? null : v));

export const requiredUrl = z.string().trim().max(300).refine(isSafeHttpUrl, "Invalid URL");

/** "React, Supabase , prompt engineering" -> ["React","Supabase","prompt engineering"] */
export const csvList = (maxItems: number, maxLen = 40) =>
  z.union([z.string(), z.array(z.string())]).transform((v) => {
    const parts = Array.isArray(v) ? v : v.split(",");
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of parts) {
      const s = raw.trim().slice(0, maxLen);
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
      if (out.length >= maxItems) break;
    }
    return out;
  });

export const joinSchema = z.object({
  fullName: trimmed(100, 2),
  email: z.string().trim().toLowerCase().max(254).regex(EMAIL_RE),
  phone: z.string().trim().max(30).regex(PHONE_RE),
  password: z.string().min(8).max(128),
  agreed: z.literal(true),
});

/** Profile links: a bare username ("prime_kw"), a bare domain
 *  ("reemora.app") or a full URL. Stored as a canonical https URL. */
const profileLink = (key: SocialKey | "website") =>
  z
    .string()
    .trim()
    .max(300)
    .transform((v, ctx) => {
      const out = normalizeLink(key, v);
      if (out === null) {
        ctx.addIssue({ code: "custom", message: "Invalid URL" });
        return z.NEVER;
      }
      return out === "" ? null : out;
    });

export const profileSchema = z.object({
  displayName: trimmed(80, 2),
  bio: trimmed(600).transform((v) => v || null),
  skills: csvList(15),
  websiteUrl: profileLink("website"),
  socialLinks: z
    .object({
      instagram: profileLink("instagram").optional(),
      linkedin: profileLink("linkedin").optional(),
      x: profileLink("x").optional(),
      youtube: profileLink("youtube").optional(),
      github: profileLink("github").optional(),
      other: profileLink("other").optional(),
    })
    .transform((links) => {
      const out: Record<string, string> = {};
      for (const k of SOCIAL_KEYS) {
        const v = links[k];
        if (v) out[k] = v;
      }
      return out;
    }),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  avatarUrl: optionalUrl,
});

export const POST_TYPES = ["discussion", "question", "project", "milestone", "tool"] as const;
export const PROJECT_STATUSES = ["prototype", "in_progress", "completed"] as const;
export const PROJECT_CATEGORIES = ["website", "app", "ai", "automation", "productivity", "other"] as const;
export const MAX_POST_IMAGES = 6;

const imageUrlList = z.array(z.string().trim().max(400)).max(MAX_POST_IMAGES).default([]);

export const postSchema = z
  .object({
    type: z.enum(POST_TYPES),
    title: trimmed(140, 3),
    body: trimmed(5000, 3),
    projectUrl: optionalUrl.optional(),
    projectCategory: z.enum(PROJECT_CATEGORIES).nullable().optional(),
    projectStatus: z.enum(PROJECT_STATUSES).nullable().optional(),
    tools: csvList(15).optional(),
    imageUrl: optionalUrl.optional(),
    galleryUrls: imageUrlList,
  })
  .superRefine((v, ctx) => {
    if (v.type === "project" && !v.projectUrl) {
      ctx.addIssue({ code: "custom", path: ["projectUrl"], message: "A project needs a link." });
    }
  });

/** Order matters: it is the display order under a project. */
export const COMMENT_CATEGORIES = ["like", "needs_work", "suggestion", "code", "design", "tip"] as const;

export const commentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: trimmed(2000, 1),
  category: z.enum(COMMENT_CATEGORIES).nullable().optional(),
});

export const CHAT_MAX_LENGTH = 1000;
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const chatAttachmentSchema = z.object({
  url: z.string().trim().max(500).refine(isSafeHttpUrl, "Invalid URL"),
  type: z.enum(["image", "file"]),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().min(0).max(CHAT_ATTACHMENT_MAX_BYTES),
});
export const chatSchema = z
  .object({
    body: z.string().trim().max(CHAT_MAX_LENGTH).default(""),
    replyToId: z.string().uuid().nullable().optional(),
    attachment: chatAttachmentSchema.nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.body && !v.attachment) ctx.addIssue({ code: "custom", path: ["body"], message: "Write a message or attach a file." });
  });

export const REPORT_TARGETS = ["post", "comment", "chat_message", "member"] as const;
export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().uuid(),
  reason: trimmed(500, 3),
});

export const entrySchema = z.object({
  challengeId: z.string().uuid(),
  title: trimmed(140, 3),
  description: trimmed(3000, 10),
  projectUrl: requiredUrl,
  imageUrl: optionalUrl.optional(),
  galleryUrls: imageUrlList,
  tools: csvList(15).optional(),
  category: trimmed(60).transform((v) => v || null).optional(),
  ownershipConfirmed: z.literal(true),
});

export const CHALLENGE_STATUSES = ["draft", "open", "paused", "voting", "closed", "finalized", "cancelled"] as const;

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Invalid date")
  .transform((v) => (v ? new Date(v).toISOString() : null));

export const challengeSchema = z.object({
  title: trimmed(140, 3),
  description: trimmed(5000, 3),
  rules: trimmed(5000).transform((v) => v || null),
  categories: csvList(10),
  submissionsOpenAt: isoDate,
  submissionsCloseAt: isoDate,
  votingOpenAt: isoDate,
  votingCloseAt: isoDate,
  maxEntries: z.number().int().min(1).max(1000).nullable(),
  allowVoteChange: z.boolean(),
});

export const ACHIEVEMENT_TIERS = ["bronze", "silver", "gold", "platinum"] as const;
export const CRITERIA_TYPES = [
  "profile_complete",
  "posts_count",
  "projects_count",
  "helpful_count",
  "project_interactions",
  "discussion_started",
  "challenge_wins",
  "project_months",
] as const;

export const achievementSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/),
  name: trimmed(80, 2),
  nameAr: trimmed(80).transform((v) => v || null),
  description: trimmed(300, 3),
  descriptionAr: trimmed(300).transform((v) => v || null),
  icon: trimmed(40, 1),
  tier: z.enum(ACHIEVEMENT_TIERS),
  points: z.number().int().min(0).max(10000),
  criteriaType: z.enum(CRITERIA_TYPES),
  criteriaThreshold: z.number().int().min(1).max(100000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

export const pointsAdjustSchema = z.object({
  userId: z.string().uuid(),
  delta: z.number().int().min(-10000).max(10000).refine((n) => n !== 0, "Delta cannot be zero"),
  reason: trimmed(300, 3),
});

export const pointsRuleSchema = z.object({
  key: z.string().trim().min(2).max(40),
  points: z.number().int().min(0).max(10000),
  dailyCap: z.number().int().min(1).max(1000).nullable(),
  isActive: z.boolean(),
});

/** Turns a zod error into the { field: message } shape the existing forms
 *  already understand (see register-form.tsx / contact route). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
