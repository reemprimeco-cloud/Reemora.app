"use client";

import * as React from "react";
import Link from "next/link";
import { EyeOff, Eye, Trash2, Check, X, ExternalLink, UserX } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import type { LoungeReportTarget } from "@/lib/supabase/lounge.types";

export interface ReportItem {
  id: string;
  target_type: LoungeReportTarget;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string;
  /** A short preview of what was reported, when it still exists. */
  preview: string | null;
  target_author: string | null;
  target_hidden: boolean | null;
}

export interface ContentItem {
  id: string;
  kind: "post" | "comment" | "chat_message";
  author_name: string;
  author_id: string;
  preview: string;
  is_hidden: boolean;
  created_at: string;
}

type Tab = "reports" | "posts" | "comments" | "chat";

export function LoungeModerationManager({ reports: initialReports, posts, comments, chat }: { reports: ReportItem[]; posts: ContentItem[]; comments: ContentItem[]; chat: ContentItem[] }) {
  const [tab, setTab] = React.useState<Tab>("reports");
  const [reports, setReports] = React.useState(initialReports);
  const [content, setContent] = React.useState<Record<"posts" | "comments" | "chat", ContentItem[]>>({ posts, comments, chat });
  const [busy, setBusy] = React.useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/lounge/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function suspendMember(userId: string, reportId?: string) {
    if (!(await confirm("Suspend this member? They lose Lounge access immediately and are notified.", "Suspend member"))) return;
    const note = window.prompt("Reason shown to the member (optional):")?.trim() || undefined;
    setBusy(userId);
    try {
      await call({ targetType: "member", targetId: userId, action: "suspend", note });
      if (reportId) {
        await call({ targetType: "report", targetId: reportId, action: "resolve", note: "Member suspended" });
        setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)));
      }
      showToast("success", "Member suspended.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function moderate(kind: "post" | "comment" | "chat_message", id: string, action: "hide" | "unhide" | "delete" | "hide_and_suspend") {
    if (action === "delete" && !(await confirm("Permanently delete this content? This cannot be undone.", "Delete content"))) return;
    if (action === "hide_and_suspend" && !(await confirm("Hide this content and suspend its author? They lose Lounge access immediately and are notified.", "Hide and suspend"))) return;
    const note = action === "hide" || action === "hide_and_suspend" ? window.prompt("Reason shown to the member (optional):")?.trim() : undefined;
    setBusy(id);
    try {
      await call({ targetType: kind, targetId: id, action, note });
      const listKey = kind === "post" ? "posts" : kind === "comment" ? "comments" : "chat";
      setContent((prev) => ({
        ...prev,
        [listKey]: action === "delete" ? prev[listKey].filter((c) => c.id !== id) : prev[listKey].map((c) => (c.id === id ? { ...c, is_hidden: action !== "unhide" } : c)),
      }));
      setReports((prev) => prev.map((r) => (r.target_id === id ? { ...r, target_hidden: action === "delete" ? null : action !== "unhide", preview: action === "delete" ? null : r.preview, status: action === "hide_and_suspend" && r.status === "open" ? "resolved" : r.status } : r)));
      if (action === "hide_and_suspend") {
        const open = reports.filter((r) => r.target_id === id && r.status === "open");
        await Promise.all(open.map((r) => call({ targetType: "report", targetId: r.id, action: "resolve", note: "Hidden and author suspended" }).catch(() => undefined)));
      }
      showToast("success", action === "delete" ? "Content deleted." : action === "hide" ? "Content hidden." : action === "hide_and_suspend" ? "Content hidden and author suspended." : "Content restored.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  async function closeReport(id: string, action: "resolve" | "dismiss") {
    setBusy(id);
    try {
      await call({ targetType: "report", targetId: id, action });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: action === "resolve" ? "resolved" : "dismissed" } : r)));
      showToast("success", `Report ${action === "resolve" ? "resolved" : "dismissed"}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  const openReports = reports.filter((r) => r.status === "open");
  const btn = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  function ContentRow({ item }: { item: ContentItem }) {
    return (
      <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-surface p-4", item.is_hidden ? "border-red-200 dark:border-red-900" : "border-border-c")}>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-soft">
            <Link href={`/lounge/members/${item.author_id}`} target="_blank" className="font-semibold text-foreground hover:text-blue-600">
              {item.author_name}
            </Link>{" "}
            · {new Date(item.created_at).toLocaleString()}
            {item.is_hidden && <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">hidden</span>}
          </p>
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm">{item.preview}</p>
        </div>
        <div className="flex gap-2">
          {item.kind === "post" && (
            <a href={`/lounge/posts/${item.id}`} target="_blank" rel="noopener" className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
              <ExternalLink size={13} /> Open
            </a>
          )}
          <button disabled={busy === item.id} onClick={() => moderate(item.kind, item.id, item.is_hidden ? "unhide" : "hide")} className={cn(btn, "border-border-c hover:border-amber-400 hover:text-amber-600")}>
            {item.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />} {item.is_hidden ? "Unhide" : "Hide"}
          </button>
          <button disabled={busy === item.id} onClick={() => moderate(item.kind, item.id, "delete")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border-c bg-surface p-1">
        {(
          [
            ["reports", `Reports (${openReports.length} open)`],
            ["posts", `Posts (${content.posts.length})`],
            ["comments", `Comments (${content.comments.length})`],
            ["chat", `Chat (${content.chat.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition", tab === key ? "bg-blue-100 text-blue-600" : "text-ink-soft hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">No reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className={cn("rounded-2xl border bg-surface p-4", r.status === "open" ? "border-amber-300" : "border-border-c opacity-70")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-ink-soft">
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 font-bold uppercase tracking-wide">{r.target_type.replace("_", " ")}</span> · reported by <span className="font-semibold text-foreground">{r.reporter_name}</span> · {new Date(r.created_at).toLocaleString()} ·{" "}
                    <span className="font-semibold capitalize">{r.status}</span>
                  </p>
                  <p className="mt-2 text-sm font-semibold">“{r.reason}”</p>
                  {r.preview !== null ? (
                    <p className="mt-2 rounded-lg bg-surface-alt px-3 py-2 text-sm text-ink-soft">
                      {r.target_author && <span className="font-semibold text-foreground">{r.target_author}: </span>}
                      <span className="line-clamp-3">{r.preview}</span>
                      {r.target_hidden && <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">hidden</span>}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-ink-soft">Content no longer exists.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.target_type === "member" && (
                    <>
                      <a href={`/lounge/members/${r.target_id}`} target="_blank" rel="noopener" className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                        <ExternalLink size={13} /> Profile
                      </a>
                      {r.status === "open" && (
                        <button disabled={busy === r.target_id} onClick={() => suspendMember(r.target_id, r.id)} className={cn(btn, "border-red-300 bg-red-50 text-red-600 hover:border-red-500 dark:border-red-900 dark:bg-red-950 dark:text-red-300")} title="Suspend this member and resolve the report">
                          <UserX size={13} /> Suspend member
                        </button>
                      )}
                    </>
                  )}
                  {r.target_type !== "member" && r.preview !== null && (
                    <>
                      {r.status === "open" && !r.target_hidden && (
                        <button disabled={busy === r.target_id} onClick={() => moderate(r.target_type as "post" | "comment" | "chat_message", r.target_id, "hide_and_suspend")} className={cn(btn, "border-red-300 bg-red-50 text-red-600 hover:border-red-500 dark:border-red-900 dark:bg-red-950 dark:text-red-300")} title="Hide the content, suspend its author and resolve the report in one tap">
                          <UserX size={13} /> Hide + suspend author
                        </button>
                      )}
                      <button disabled={busy === r.target_id} onClick={() => moderate(r.target_type as "post" | "comment" | "chat_message", r.target_id, r.target_hidden ? "unhide" : "hide")} className={cn(btn, "border-border-c hover:border-amber-400 hover:text-amber-600")}>
                        {r.target_hidden ? <Eye size={13} /> : <EyeOff size={13} />} {r.target_hidden ? "Unhide" : "Hide"}
                      </button>
                      <button disabled={busy === r.target_id} onClick={() => moderate(r.target_type as "post" | "comment" | "chat_message", r.target_id, "delete")} className={cn(btn, "border-border-c hover:border-red-300 hover:text-red-500")}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                  {r.status === "open" && (
                    <>
                      <button disabled={busy === r.id} onClick={() => closeReport(r.id, "resolve")} className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300")}>
                        <Check size={13} /> Resolve
                      </button>
                      <button disabled={busy === r.id} onClick={() => closeReport(r.id, "dismiss")} className={cn(btn, "border-border-c hover:border-blue-400")}>
                        <X size={13} /> Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab !== "reports" && (
        <div className="space-y-3">
          {content[tab].length === 0 && <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">Nothing here yet.</p>}
          {content[tab].map((item) => (
            <ContentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
