"use client";

import * as React from "react";
import { Mail, MailOpen, Trash2, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PrivateSessionRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

type RequestRow = PrivateSessionRequest & { courses?: { title: string } | { title: string }[] | null };

function courseTitleOf(row: RequestRow): string | null {
  const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return c?.title ?? null;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D+/g, "");
}

export function PrivateSessionInbox({ initialRequests }: { initialRequests: RequestRow[] }) {
  const [requests, setRequests] = React.useState(initialRequests);
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function toggleRead(m: RequestRow) {
    const supabase = createClient();
    const { error } = await supabase.from("private_session_requests").update({ is_read: !m.is_read }).eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setRequests((prev) => prev.map((it) => (it.id === m.id ? { ...it, is_read: !it.is_read } : it)));
  }

  async function handleDelete(m: RequestRow) {
    if (!(await confirm(`Delete private session request from "${m.full_name}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("private_session_requests").delete().eq("id", m.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setRequests((prev) => prev.filter((it) => it.id !== m.id));
    showToast("success", "Request deleted.");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Name / Contact</th>
              <th className="px-4 py-3 text-left">Preferred</th>
              <th className="px-4 py-3 text-left">Group</th>
              <th className="px-4 py-3 text-left">Certificate</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-left">Actions</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {requests.length ? (
              requests.map((m, i) => {
                const courseTitle = courseTitleOf(m);
                const waDigits = digitsOnly(m.phone);
                return (
                  <tr key={m.id} className={cn("border-t border-border-c align-top", !m.is_read && "bg-blue-100/60")}>
                    <td className="px-4 py-3 text-xs font-semibold text-ink-soft">{i + 1}</td>
                    <td className="max-w-[180px] px-4 py-3">
                      <p className="truncate text-[13px] font-bold" title={m.full_name}>{m.full_name}</p>
                      <p className="truncate text-xs text-ink-soft" title={m.email}>{m.email}</p>
                      <p className="text-xs text-ink-soft">{m.phone}</p>
                      {courseTitle && (
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-blue-600" title={courseTitle}>
                          {courseTitle}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p>{m.preferred_date ? formatDate(m.preferred_date) : "—"}</p>
                      <p className="text-ink-soft">{m.preferred_time || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{m.group_size ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold",
                          m.certificate_needed
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        )}
                      >
                        {m.certificate_needed ? "Needed" : "Not needed"}
                      </span>
                    </td>
                    <td className="max-w-[180px] px-4 py-3">
                      <p className="line-clamp-3 text-xs text-foreground" title={m.notes ?? undefined}>
                        {m.notes?.trim() || <span className="text-ink-soft">—</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={waDigits ? `https://wa.me/${waDigits}` : undefined}
                          target={waDigits ? "_blank" : undefined}
                          rel={waDigits ? "noopener noreferrer" : undefined}
                          aria-disabled={!waDigits}
                          aria-label={`WhatsApp ${m.full_name}`}
                          onClick={(e) => {
                            if (!waDigits) e.preventDefault();
                          }}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg border transition",
                            waDigits
                              ? "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                              : "cursor-not-allowed border-border-c bg-surface-alt text-ink-soft"
                          )}
                          title={waDigits ? "Open WhatsApp chat" : "Phone missing"}
                        >
                          <MessageCircle size={13} aria-hidden="true" />
                        </a>
                        <a
                          href={`tel:${m.phone.replace(/\s+/g, "")}`}
                          aria-label={`Call ${m.full_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                          title="Call this number"
                        >
                          <Phone size={13} aria-hidden="true" />
                        </a>
                        <button
                          onClick={() => toggleRead(m)}
                          aria-label={m.is_read ? `Mark request from ${m.full_name} as unread` : `Mark request from ${m.full_name} as read`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-blue-400 hover:text-blue-600"
                          title={m.is_read ? "Mark unread" : "Mark read"}
                        >
                          {m.is_read ? <MailOpen size={13} /> : <Mail size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          aria-label={`Delete request from ${m.full_name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-c bg-surface hover:border-red-300 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">No private session requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
