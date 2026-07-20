"use client";

import * as React from "react";
import { CheckCircle2, Circle, Trash2, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseWaitlistEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

type WaitlistRow = CourseWaitlistEntry & { courses?: { title: string } | { title: string }[] | null };

function courseTitleOf(row: WaitlistRow): string | null {
  const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return c?.title ?? null;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export function WaitlistInbox({ initialEntries }: { initialEntries: WaitlistRow[] }) {
  const [entries, setEntries] = React.useState(initialEntries);
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function toggleNotified(m: WaitlistRow) {
    const supabase = createClient();
    const { error } = await supabase.from("course_waitlist").update({ notified: !m.notified }).eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setEntries((prev) => prev.map((it) => (it.id === m.id ? { ...it, notified: !it.notified } : it)));
  }

  async function handleDelete(m: WaitlistRow) {
    if (!(await confirm(`Remove "${m.full_name}" from the waitlist?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_waitlist").delete().eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setEntries((prev) => prev.filter((it) => it.id !== m.id));
    showToast("success", "Removed from waitlist.");
  }

  return (
    <div className="space-y-3">
      {entries.length ? (
        entries.map((m) => {
          const courseTitle = courseTitleOf(m);
          const waDigits = digitsOnly(m.phone);
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5",
                m.notified ? "border-border-c bg-surface" : "border-blue-400 bg-blue-100"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {m.full_name} <span className="font-normal text-ink-soft">— {m.phone}</span>
                </p>
                {courseTitle && <p className="mt-1 text-sm font-semibold text-blue-600">Waiting for: {courseTitle}</p>}
                <p className="mt-0.5 text-xs text-ink-soft">{new Date(m.created_at).toLocaleString()}</p>
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
                <button
                  onClick={() => toggleNotified(m)}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                    m.notified
                      ? "border-border-c bg-surface text-ink-soft hover:border-blue-400 hover:text-blue-600"
                      : "border-blue-500 bg-blue-500 text-white hover:bg-navy-800"
                  )}
                  title={m.notified ? "Mark as not yet notified" : "Mark as notified"}
                >
                  {m.notified ? <CheckCircle2 size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}
                  {m.notified ? "Notified" : "Mark notified"}
                </button>
                <button
                  onClick={() => handleDelete(m)}
                  aria-label={`Remove ${m.full_name} from waitlist`}
                  title="Remove"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-center text-ink-soft">No one on the waitlist yet.</p>
      )}
    </div>
  );
}
