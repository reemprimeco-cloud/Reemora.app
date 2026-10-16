"use client";

import * as React from "react";
import { Send, MessageCircle, Copy, Check, Search, UserPlus, Link2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import type { InviteResult } from "@/lib/lounge/invites";

export interface Candidate {
  key: string;
  full_name: string;
  email: string;
  phone: string | null;
  courses: string[];
  registered_at: string;
  /** Lounge state for this email, if any. */
  lounge: { status: string; invited_at: string | null; last_sign_in_at: string | null } | null;
}

function waHref(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  const base = digits ? `https://wa.me/${digits.startsWith("965") || digits.length > 8 ? digits : `965${digits}`}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

function inviteMessage(name: string, link: string) {
  return `مرحباً ${name}! 👋\nتمت دعوتك للانضمام إلى مجتمع ريمورا (Reemora Lounge) — مساحة خاصة لمن يبنون المواقع والتطبيقات وأدوات الذكاء الاصطناعي. شارك مشاريعك، اطرح أسئلتك، وتعاون مع الأعضاء.\n\nHi ${name}! You're invited to the Reemora Lounge — a private community for people building websites, apps and AI tools. Share your projects, ask questions and collaborate.\n\nافتح الرابط لتفعيل حسابك / Open this link to activate your account:\n${link}`;
}

function loungeBadge(l: Candidate["lounge"]) {
  if (!l) return null;
  if (l.status === "approved" && l.last_sign_in_at) return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-950 dark:text-green-300">Member</span>;
  if (l.status === "approved" && l.invited_at) return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">Invited · not joined yet</span>;
  if (l.status === "approved") return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-950 dark:text-green-300">Approved</span>;
  return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold capitalize text-amber-700 dark:bg-amber-950 dark:text-amber-300">{l.status}</span>;
}

export function LoungeInvitesManager({ candidates: initial }: { candidates: Candidate[] }) {
  const [candidates, setCandidates] = React.useState(initial);
  const [query, setQuery] = React.useState("");
  const [onlyNew, setOnlyNew] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [links, setLinks] = React.useState<Record<string, string>>({});
  const [copied, setCopied] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState({ fullName: "", email: "", phone: "" });
  const { showToast } = useToast();
  const confirm = useConfirm();

  const visible = candidates.filter((c) => {
    if (onlyNew && c.lounge?.status === "approved" && c.lounge.last_sign_in_at) return false;
    const q = query.trim().toLowerCase();
    return !q || c.full_name.toLowerCase().includes(q) || c.email.includes(q) || (c.phone ?? "").includes(q) || c.courses.some((t) => t.toLowerCase().includes(q));
  });

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyResults(results: InviteResult[], channel: "email" | "link") {
    const byEmail = new Map(results.map((r) => [r.email, r]));
    setCandidates((prev) =>
      prev.map((c) => {
        const r = byEmail.get(c.email.toLowerCase());
        if (!r || !r.ok) return c;
        return { ...c, lounge: { status: "approved", invited_at: c.lounge?.invited_at ?? new Date().toISOString(), last_sign_in_at: c.lounge?.last_sign_in_at ?? null } };
      })
    );
    if (channel === "link") {
      setLinks((prev) => ({ ...prev, ...Object.fromEntries(results.filter((r) => r.ok && r.link).map((r) => [r.email, r.link as string])) }));
    }
    const failed = results.filter((r) => !r.ok);
    const okCount = results.length - failed.length;
    if (okCount) showToast("success", channel === "email" ? `${okCount} invitation email(s) sent.` : `${okCount} invite link(s) ready.`);
    for (const f of failed) showToast("error", `${f.email}: ${f.message ?? "failed"}`);
  }

  async function send(people: { fullName: string; email: string; phone: string | null }[], channel: "email" | "link") {
    if (!people.length) return;
    if (channel === "email" && !(await confirm(`Send ${people.length} invitation email(s) through Supabase? Note: without custom SMTP, Supabase only sends a few emails per hour — use WhatsApp links for bigger batches.`, "Send invitations"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lounge/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, invites: people }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      applyResults(data.results as InviteResult[], channel);
      setSelected(new Set());
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function copy(email: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(email);
    setTimeout(() => setCopied(null), 1500);
  }

  const selectedPeople = candidates.filter((c) => selected.has(c.key)).map((c) => ({ fullName: c.full_name, email: c.email, phone: c.phone }));
  const btn = "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.fullName.trim() || !manual.email.trim()) return;
          const person = { fullName: manual.fullName.trim(), email: manual.email.trim().toLowerCase(), phone: manual.phone.trim() || null };
          setCandidates((prev) => (prev.some((c) => c.email === person.email) ? prev : [{ key: `manual:${person.email}`, full_name: person.fullName, email: person.email, phone: person.phone, courses: [], registered_at: new Date().toISOString(), lounge: null }, ...prev]));
          setManual({ fullName: "", email: "", phone: "" });
          setSelected((prev) => new Set(prev).add(`manual:${person.email}`));
        }}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-border-c bg-surface p-5 sm:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} placeholder="Full name" aria-label="Full name" className="rounded-lg border border-border-c bg-surface-alt px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
        <input value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} placeholder="Email" type="email" aria-label="Email" dir="ltr" className="rounded-lg border border-border-c bg-surface-alt px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
        <input value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} placeholder="+965 phone (for WhatsApp)" aria-label="Phone" dir="ltr" className="rounded-lg border border-border-c bg-surface-alt px-4 py-2.5 text-sm outline-none focus:border-blue-400" />
        <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
          <UserPlus size={15} /> Add to list
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone or course" aria-label="Search" className="w-full rounded-full border border-border-c bg-surface py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> Hide people already in the Lounge
        </label>
        <button type="button" onClick={() => setSelected(new Set(visible.map((c) => c.key)))} className={cn(btn, "border-border-c")}>
          Select all ({visible.length})
        </button>
        <button type="button" onClick={() => setSelected(new Set())} className={cn(btn, "border-border-c")}>
          Clear
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-400 bg-blue-100 px-5 py-4">
          <span className="text-sm font-bold text-blue-700">{selected.size} selected</span>
          <button type="button" disabled={busy} onClick={() => send(selectedPeople, "email")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-transparent bg-blue-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            <Send size={13} /> Send email invitations
          </button>
          <button type="button" disabled={busy} onClick={() => send(selectedPeople, "link")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-blue-500 bg-surface px-5 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-500 hover:text-white disabled:opacity-60">
            <Link2 size={13} /> Generate WhatsApp links
          </button>
          <span className="text-xs text-blue-700">Both pre-approve the member. Links appear on each row — send them one by one from WhatsApp.</span>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && <p className="rounded-2xl border border-border-c bg-surface p-8 text-center text-ink-soft">No one matches.</p>}
        {visible.map((c) => {
          const link = links[c.email];
          const isMember = c.lounge?.status === "approved" && c.lounge.last_sign_in_at;
          return (
            <div key={c.key} className={cn("flex flex-wrap items-center gap-3 rounded-2xl border bg-surface px-4 py-3", selected.has(c.key) ? "border-blue-400" : "border-border-c")}>
              <input type="checkbox" checked={selected.has(c.key)} onChange={() => toggle(c.key)} aria-label={`Select ${c.full_name}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{c.full_name}</span>
                  {loungeBadge(c.lounge)}
                </div>
                <p className="text-xs text-ink-soft" dir="ltr">
                  {c.email} · {c.phone ?? "—"}
                </p>
                {c.courses.length > 0 && <p className="mt-0.5 text-xs text-ink-soft">{c.courses.join(" · ")}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {link ? (
                  <>
                    <a href={waHref(c.phone, inviteMessage(c.full_name, link))} target="_blank" rel="noopener" className={cn(btn, "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300")}>
                      <MessageCircle size={13} /> Open WhatsApp
                    </a>
                    <button type="button" onClick={() => copy(c.email, link)} className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                      {copied === c.email ? <Check size={13} /> : <Copy size={13} />} {copied === c.email ? "Copied" : "Copy link"}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy || Boolean(isMember)} onClick={() => send([{ fullName: c.full_name, email: c.email, phone: c.phone }], "email")} className={cn(btn, "border-border-c hover:border-blue-400 hover:text-blue-600")}>
                      <Send size={13} /> Email
                    </button>
                    <button type="button" disabled={busy} onClick={() => send([{ fullName: c.full_name, email: c.email, phone: c.phone }], "link")} className={cn(btn, "border-border-c hover:border-green-600 hover:text-green-700")}>
                      <MessageCircle size={13} /> WhatsApp link
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
