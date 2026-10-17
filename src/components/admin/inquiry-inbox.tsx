"use client";

import * as React from "react";
import { Mail, MailOpen, Trash2, Phone, MessageCircle, Reply, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseInquiry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import {
  type AnnounceCourse,
  type MailClient,
  buildAnnouncement,
  buildCourseReply,
  digitsOnly,
  firstName,
  mailtoAllHref,
  mailtoHref,
  openGmail,
  readMailClient,
  storeMailClient,
} from "@/lib/admin/mail";

type InquiryRow = CourseInquiry & { courses?: AnnounceCourse | AnnounceCourse[] | null };

function courseOf(row: InquiryRow): AnnounceCourse | null {
  const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return c ?? null;
}

export function InquiryInbox({
  initialInquiries,
  allCourses,
  siteUrl,
  adminEmail,
}: {
  initialInquiries: InquiryRow[];
  allCourses: AnnounceCourse[];
  siteUrl: string;
  adminEmail: string;
}) {
  const [inquiries, setInquiries] = React.useState(initialInquiries);
  const [announceCourseId, setAnnounceCourseId] = React.useState("");
  // "matching" = only people who asked about the selected course (the usual
  // case: tell them it opened); "all" = every inquiry, for a general push.
  const [audience, setAudience] = React.useState<"matching" | "all">("matching");
  const [mailClient, setMailClient] = React.useState<MailClient>("default");
  React.useEffect(() => setMailClient(readMailClient()), []);
  function chooseMailClient(next: MailClient) {
    setMailClient(next);
    storeMailClient(next);
  }
  const { showToast } = useToast();
  const confirm = useConfirm();

  const courseById = React.useMemo(() => {
    const map = new Map<string, AnnounceCourse>();
    for (const c of allCourses) map.set(c.id, c);
    return map;
  }, [allCourses]);

  const announceCourse = announceCourseId ? (courseById.get(announceCourseId) ?? null) : null;
  const announcement = announceCourse ? buildAnnouncement(announceCourse, siteUrl) : null;
  const recipients = React.useMemo(() => {
    const rows = audience === "matching" && announceCourseId ? inquiries.filter((m) => m.course_id === announceCourseId) : inquiries;
    return Array.from(new Set(rows.map((m) => m.email.trim().toLowerCase()).filter(Boolean)));
  }, [inquiries, audience, announceCourseId]);
  const canSend = Boolean(announcement) && recipients.length > 0;

  async function toggleRead(m: InquiryRow) {
    const supabase = createClient();
    const { error } = await supabase.from("course_inquiries").update({ is_read: !m.is_read }).eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setInquiries((prev) => prev.map((it) => (it.id === m.id ? { ...it, is_read: !it.is_read } : it)));
  }

  async function handleDelete(m: InquiryRow) {
    if (!(await confirm(`Delete inquiry from "${m.full_name}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_inquiries").delete().eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setInquiries((prev) => prev.filter((it) => it.id !== m.id));
    showToast("success", "Inquiry deleted.");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border-c bg-surface-alt p-4">
        <div>
          <label htmlFor="inquiry-announce-course" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Announce a course
          </label>
          <select
            id="inquiry-announce-course"
            value={announceCourseId}
            onChange={(e) => setAnnounceCourseId(e.target.value)}
            className="min-h-[38px] min-w-[220px] rounded-lg border border-border-c bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          >
            <option value="">Select a course…</option>
            {allCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Send to</span>
          <div role="radiogroup" aria-label="Recipients" className="flex rounded-lg border border-border-c bg-surface p-0.5">
            {(["matching", "all"] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={audience === a}
                onClick={() => setAudience(a)}
                className={cn("min-h-[32px] rounded-md px-3 text-xs font-semibold transition", audience === a ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}
              >
                {a === "matching" ? "Asked about this course" : "Everyone"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-soft">Open emails in</span>
          <div role="radiogroup" aria-label="Email program" className="flex rounded-lg border border-border-c bg-surface p-0.5">
            {(["gmail", "default"] as MailClient[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={mailClient === c}
                onClick={() => chooseMailClient(c)}
                className={cn("min-h-[32px] rounded-md px-3 text-xs font-semibold transition", mailClient === c ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}
              >
                {c === "gmail" ? "Gmail" : "Mail app"}
              </button>
            ))}
          </div>
        </div>
        <a
          href={announcement ? mailtoAllHref(adminEmail, recipients, announcement.subject, announcement.emailBody) : undefined}
          aria-disabled={!canSend}
          onClick={(e) => {
            if (!announcement || !canSend) {
              e.preventDefault();
              return;
            }
            if (mailClient === "gmail") {
              e.preventDefault();
              openGmail({ to: adminEmail, bcc: recipients, subject: announcement.subject, body: announcement.emailBody });
            }
          }}
          className={cn(
            "inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
            canSend ? "border-blue-500 bg-blue-500 text-white hover:bg-navy-800" : "cursor-not-allowed border-border-c bg-surface text-ink-soft"
          )}
        >
          <Mail size={14} aria-hidden="true" />
          Email all {recipients.length ? `(${recipients.length})` : ""}
        </a>
        <button
          type="button"
          disabled={recipients.length === 0}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(recipients.join(", "));
              showToast("success", `Copied ${recipients.length} addresses.`);
            } catch {
              showToast("error", "Could not copy. Select the addresses manually.");
            }
          }}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-border-c bg-surface px-4 py-2 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          title="Copy every address to paste into the BCC field yourself"
        >
          <Copy size={14} aria-hidden="true" /> Copy addresses
        </button>
        <p className="max-w-sm text-xs text-ink-soft">
          {announcement
            ? `${mailClient === "gmail" ? "Opens a new Gmail draft" : "Opens your Mail app"} telling ${
                audience === "matching" ? "everyone who asked about this course" : "everyone"
              } that registration is open, with all addresses in BCC. Each row's WhatsApp button carries the same message.`
            : "Pick the course that just opened. Email all drafts one message to everyone who asked about it; WhatsApp sends it one by one."}
        </p>
      </div>

      <div className="space-y-3">
        {inquiries.length ? (
          inquiries.map((m) => {
            const course = courseOf(m);
            const replyCourse = announceCourse ?? course;
            const { subject, body } = buildCourseReply(m.full_name, siteUrl, replyCourse);
            const mailto = mailtoHref(m.email, subject, body);
            const waDigits = digitsOnly(m.phone);
            const waText = announcement ? announcement.waTemplate(firstName(m.full_name)) : null;
            return (
              <div key={m.id} className={cn("rounded-2xl border p-5", m.is_read ? "border-border-c bg-surface" : "border-blue-400 bg-blue-100")}>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {m.full_name} <span className="font-normal text-ink-soft">— {m.email}</span>
                    </p>
                    <p className="text-xs text-ink-soft" dir="ltr">{m.phone}</p>
                    {course && <p className="mt-1 text-sm font-semibold text-blue-600">Interested in: {course.title}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink-soft">{new Date(m.created_at).toLocaleString()}</span>
                    <a
                      href={waDigits ? `https://wa.me/${waDigits}${waText ? `?text=${encodeURIComponent(waText)}` : ""}` : undefined}
                      target={waDigits ? "_blank" : undefined}
                      rel={waDigits ? "noopener noreferrer" : undefined}
                      aria-disabled={!waDigits}
                      aria-label={`WhatsApp ${m.full_name}`}
                      onClick={(e) => {
                        if (!waDigits) e.preventDefault();
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border transition",
                        waDigits
                          ? "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                          : "cursor-not-allowed border-border-c bg-surface-alt text-ink-soft"
                      )}
                      title={!waDigits ? "Phone missing" : waText ? `Send the announcement for ${announceCourse?.title}` : "Open WhatsApp chat"}
                    >
                      <MessageCircle size={14} aria-hidden="true" />
                    </a>
                    <a
                      href={`tel:${m.phone.replace(/\s+/g, "")}`}
                      aria-label={`Call ${m.full_name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                      title="Call this number"
                    >
                      <Phone size={14} aria-hidden="true" />
                    </a>
                    <a
                      href={mailto}
                      onClick={(e) => {
                        if (mailClient === "gmail") {
                          e.preventDefault();
                          openGmail({ to: m.email, subject, body });
                        }
                      }}
                      aria-label={`Reply to ${m.full_name} by email`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500 bg-blue-500 text-white hover:bg-navy-800"
                      title={replyCourse ? `Reply: ${replyCourse.title} is open for registration` : "Reply with a general template"}
                    >
                      <Reply size={14} aria-hidden="true" />
                    </a>
                    <button
                      onClick={() => toggleRead(m)}
                      aria-label={m.is_read ? `Mark inquiry from ${m.full_name} as unread` : `Mark inquiry from ${m.full_name} as read`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                      title={m.is_read ? "Mark unread" : "Mark read"}
                    >
                      {m.is_read ? <MailOpen size={14} /> : <Mail size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      aria-label={`Delete inquiry from ${m.full_name}`}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-red-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {m.message && <p className="text-sm text-ink-soft">{m.message}</p>}
              </div>
            );
          })
        ) : (
          <p className="text-center text-ink-soft">No inquiries yet.</p>
        )}
      </div>
    </div>
  );
}
