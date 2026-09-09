"use client";

import * as React from "react";
import { Trash2, Plus, EyeOff, Eye, Star, Download, Copy, Check } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import type { Testimonial } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

interface CourseOption {
  id: string;
  title: string;
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} className={n <= rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-border-c"} />
      ))}
    </span>
  );
}

function FeedbackQrCode({ feedbackUrl }: { feedbackUrl: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "reemora-feedback-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl border border-border-c bg-surface-alt p-5">
      <div className="rounded-xl border border-border-c bg-white p-3">
        <QRCodeCanvas ref={canvasRef} value={feedbackUrl} size={140} marginSize={2} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">Course Feedback QR Code</p>
        <p className="max-w-sm text-xs text-ink-soft">
          One code for every course — students scan it, pick their course, rate it, and leave a quote. Print it and
          display it at the venue. Nothing goes public until you approve it below.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500 bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800"
          >
            <Download size={13} aria-hidden="true" /> Download PNG
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-c bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? "Copied!" : feedbackUrl}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestimonialManager({
  initialTestimonials,
  courses,
  feedbackUrl,
}: {
  initialTestimonials: Testimonial[];
  courses: CourseOption[];
  feedbackUrl: string;
}) {
  const [testimonials, setTestimonials] = React.useState(initialTestimonials);
  const [studentName, setStudentName] = React.useState("");
  const [roleCompany, setRoleCompany] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const courseById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) map.set(c.id, c.title);
    return map;
  }, [courses]);

  const pending = testimonials.filter((t) => !t.is_published);
  const published = testimonials.filter((t) => t.is_published);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !quote.trim()) {
      setError("Please enter a student name and a testimonial quote.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("testimonials")
      .insert({ student_name: studentName.trim(), role_company: roleCompany.trim() || null, quote: quote.trim(), display_order: testimonials.length + 1 })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTestimonials((prev) => [...prev, data as Testimonial]);
    setStudentName("");
    setRoleCompany("");
    setQuote("");
    showToast("success", "Testimonial added.");
  }

  async function handleTogglePublished(t: Testimonial) {
    const supabase = createClient();
    const { error } = await supabase.from("testimonials").update({ is_published: !t.is_published }).eq("id", t.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setTestimonials((prev) => prev.map((item) => (item.id === t.id ? { ...item, is_published: !item.is_published } : item)));
    showToast("success", t.is_published ? "Unpublished." : "Approved — now visible on the course page.");
  }

  async function handleDelete(t: Testimonial) {
    if (!(await confirm(`Delete testimonial from "${t.student_name}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("testimonials").delete().eq("id", t.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setTestimonials((prev) => prev.filter((item) => item.id !== t.id));
    showToast("success", "Testimonial deleted.");
  }

  function Row(t: Testimonial) {
    const courseTitle = t.course_id ? courseById.get(t.course_id) : null;
    return (
      <div key={t.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border-c bg-surface p-5">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {courseTitle && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {courseTitle}
              </span>
            )}
            <Stars rating={t.rating} />
          </div>
          <p className="mb-1.5 text-sm italic text-ink-soft">&ldquo;{t.quote}&rdquo;</p>
          <p className="text-sm font-semibold">{t.student_name}{t.role_company ? ` — ${t.role_company}` : ""}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => handleTogglePublished(t)}
            aria-label={t.is_published ? `Unpublish testimonial from ${t.student_name}` : `Approve testimonial from ${t.student_name}`}
            title={t.is_published ? "Unpublish" : "Approve"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition",
              t.is_published
                ? "border-border-c hover:border-blue-400 hover:text-blue-600"
                : "border-green-600/30 bg-green-50 text-green-700 hover:border-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
            )}
          >
            {t.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={() => handleDelete(t)} aria-label={`Delete testimonial from ${t.student_name}`} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FeedbackQrCode feedbackUrl={feedbackUrl} />

      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border-c bg-surface p-6 sm:grid-cols-2">
        <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student name" aria-label="Student name" required className={inputClass} />
        <input value={roleCompany} onChange={(e) => setRoleCompany(e.target.value)} placeholder="Role / Company" aria-label="Role or company" className={inputClass} />
        <textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Testimonial quote" aria-label="Testimonial quote" required className={`${inputClass} min-h-[80px] sm:col-span-2`} />
        <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 sm:col-span-2">
          <Plus size={16} /> {saving ? "Adding..." : "Add Testimonial"}
        </button>
      </form>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-600">
            Pending Approval ({pending.length})
          </h2>
          <div className="space-y-3">{pending.map(Row)}</div>
        </div>
      )}

      <div>
        {pending.length > 0 && <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">Published</h2>}
        <div className="space-y-3">
          {published.length ? published.map(Row) : <p className="text-center text-ink-soft">No testimonials yet.</p>}
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";
