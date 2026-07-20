"use client";

import * as React from "react";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseInquiry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

type InquiryRow = CourseInquiry & { courses?: { title: string } | { title: string }[] | null };

function courseTitleOf(row: InquiryRow): string | null {
  const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return c?.title ?? null;
}

export function InquiryInbox({ initialInquiries }: { initialInquiries: InquiryRow[] }) {
  const [inquiries, setInquiries] = React.useState(initialInquiries);
  const { showToast } = useToast();
  const confirm = useConfirm();

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
    <div className="space-y-3">
      {inquiries.length ? (
        inquiries.map((m) => {
          const courseTitle = courseTitleOf(m);
          return (
            <div key={m.id} className={cn("rounded-2xl border p-5", m.is_read ? "border-border-c bg-surface" : "border-blue-400 bg-blue-100")}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {m.full_name} <span className="font-normal text-ink-soft">— {m.email}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{m.phone}</p>
                  {courseTitle && (
                    <p className="mt-1 text-sm font-semibold text-blue-600">Interested in: {courseTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-soft">{new Date(m.created_at).toLocaleString()}</span>
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
  );
}
