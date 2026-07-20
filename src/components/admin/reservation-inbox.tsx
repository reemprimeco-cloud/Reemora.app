"use client";

import * as React from "react";
import { Mail, MailOpen, Trash2, Phone, MessageCircle, Reply } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SeatReservation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

export interface ReservationCourse {
  id: string;
  title: string;
  slug: string;
  short_description: string;
}

type ReservationRow = SeatReservation & {
  courses?: ReservationCourse | ReservationCourse[] | null;
};

function courseOf(row: ReservationRow): ReservationCourse | null {
  const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return c ?? null;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first || trimmed;
}

function buildEmailReply(
  r: ReservationRow,
  siteUrl: string,
  course: ReservationCourse | null
): { subject: string; body: string } {
  const name = firstName(r.full_name);

  if (course) {
    const subject = `Reemora — Welcome to ${course.title}`;
    const link = `${siteUrl}/register/${course.slug}`;
    const body = [
      `Hi ${name},`,
      "",
      "Thanks for reserving your seat with Reemora — we're excited to have you!",
      "",
      `You're welcome to register for our course "${course.title}", where you'll learn: ${course.short_description}`,
      "",
      "When you're ready to lock in your spot, register and pay securely here:",
      link,
      "",
      "If you have any questions before registering, just reply to this email.",
      "",
      "See you soon,",
      "Reemora Training",
    ].join("\n");
    return { subject, body };
  }

  const subject = "Reemora — Your seat reservation";
  const body = [
    `Hi ${name},`,
    "",
    "Thanks for reserving your seat with Reemora — we're excited to help you get started.",
    "",
    "Based on what you shared, we'd love to recommend the right course for you. You can browse our full catalog here:",
    `${siteUrl}/courses`,
    "",
    "Reply to this email if you'd like a personal recommendation and we'll follow up.",
    "",
    "See you soon,",
    "Reemora Training",
  ].join("\n");
  return { subject, body };
}

function mailtoHref(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${email}?${params.toString().replace(/\+/g, "%20")}`;
}

export function ReservationInbox({
  initialReservations,
  allCourses,
  siteUrl,
}: {
  initialReservations: ReservationRow[];
  allCourses: ReservationCourse[];
  siteUrl: string;
}) {
  const [reservations, setReservations] = React.useState(initialReservations);
  // Admin's per-row course override (keyed by reservation id).
  // Empty string = generic "no course" template.
  const [replyCourseId, setReplyCourseId] = React.useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const r of initialReservations) {
      const c = courseOf(r);
      if (c) seed[r.id] = c.id;
    }
    return seed;
  });
  const { showToast } = useToast();
  const confirm = useConfirm();

  const courseById = React.useMemo(() => {
    const map = new Map<string, ReservationCourse>();
    for (const c of allCourses) map.set(c.id, c);
    return map;
  }, [allCourses]);

  async function toggleRead(m: ReservationRow) {
    const supabase = createClient();
    const { error } = await supabase
      .from("seat_reservations")
      .update({ is_read: !m.is_read })
      .eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setReservations((prev) => prev.map((it) => (it.id === m.id ? { ...it, is_read: !it.is_read } : it)));
  }

  async function handleDelete(m: ReservationRow) {
    if (!(await confirm(`Delete reservation from "${m.full_name}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("seat_reservations").delete().eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setReservations((prev) => prev.filter((it) => it.id !== m.id));
    showToast("success", "Reservation deleted.");
  }

  return (
    <div className="space-y-3">
      {reservations.length ? (
        reservations.map((m) => {
          const requested = courseOf(m);
          const selectedId = replyCourseId[m.id] ?? "";
          const selectedCourse = selectedId ? courseById.get(selectedId) ?? null : null;
          const waDigits = digitsOnly(m.phone);
          const { subject, body } = buildEmailReply(m, siteUrl, selectedCourse);
          const mailto = mailtoHref(m.email, subject, body);
          return (
            <div
              key={m.id}
              className={cn(
                "rounded-2xl border p-5",
                m.is_read ? "border-border-c bg-surface" : "border-blue-400 bg-blue-100"
              )}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {m.full_name} <span className="font-normal text-ink-soft">— {m.email}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{m.phone}</p>
                  {requested && (
                    <p className="mt-1 text-sm font-semibold text-blue-600">Interested in: {requested.title}</p>
                  )}
                </div>
                <span className="text-xs text-ink-soft">{new Date(m.created_at).toLocaleString()}</span>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border-c bg-surface p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Interest</p>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {m.interest?.trim() || <span className="text-ink-soft">—</span>}
                  </p>
                </div>
                <div className="rounded-lg border border-border-c bg-surface p-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    Background / Skills
                  </p>
                  <p className="whitespace-pre-line text-sm text-foreground">
                    {m.skills?.trim() || <span className="text-ink-soft">—</span>}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor={`reply-course-${m.id}`} className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Recommend course
                </label>
                <select
                  id={`reply-course-${m.id}`}
                  value={selectedId}
                  onChange={(e) => setReplyCourseId((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  className="min-h-[36px] flex-1 rounded-lg border border-border-c bg-surface px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:flex-none sm:min-w-[240px]"
                >
                  <option value="">(No course — generic reply)</option>
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={waDigits ? `https://wa.me/${waDigits}` : undefined}
                  target={waDigits ? "_blank" : undefined}
                  rel={waDigits ? "noopener noreferrer" : undefined}
                  aria-disabled={!waDigits}
                  onClick={(e) => {
                    if (!waDigits) e.preventDefault();
                  }}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                    waDigits
                      ? "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                      : "cursor-not-allowed border-border-c bg-surface-alt text-ink-soft"
                  )}
                  title={waDigits ? "Open WhatsApp chat" : "Phone missing"}
                >
                  <MessageCircle size={13} aria-hidden="true" /> WhatsApp
                </a>
                <a
                  href={`tel:${m.phone.replace(/\s+/g, "")}`}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600"
                  title="Call this number"
                >
                  <Phone size={13} aria-hidden="true" /> Call
                </a>
                <a
                  href={mailto}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-blue-500 bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800"
                  title={selectedCourse ? `Reply about ${selectedCourse.title}` : "Reply with generic template"}
                >
                  <Reply size={13} aria-hidden="true" /> Reply by Email
                </a>
                <div className="ms-auto flex items-center gap-2">
                  <button
                    onClick={() => toggleRead(m)}
                    aria-label={
                      m.is_read
                        ? `Mark reservation from ${m.full_name} as unread`
                        : `Mark reservation from ${m.full_name} as read`
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                    title={m.is_read ? "Mark unread" : "Mark read"}
                  >
                    {m.is_read ? <MailOpen size={14} /> : <Mail size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    aria-label={`Delete reservation from ${m.full_name}`}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-red-300 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-ink-soft">No reservations yet.</p>
      )}
    </div>
  );
}
