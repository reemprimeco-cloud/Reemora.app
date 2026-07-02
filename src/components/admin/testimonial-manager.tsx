"use client";

import * as React from "react";
import { Trash2, Plus, EyeOff, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Testimonial } from "@/lib/types";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

export function TestimonialManager({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const [testimonials, setTestimonials] = React.useState(initialTestimonials);
  const [studentName, setStudentName] = React.useState("");
  const [roleCompany, setRoleCompany] = React.useState("");
  const [quote, setQuote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

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

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border-c bg-surface p-6 sm:grid-cols-2">
        <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student name" aria-label="Student name" required className={inputClass} />
        <input value={roleCompany} onChange={(e) => setRoleCompany(e.target.value)} placeholder="Role / Company" aria-label="Role or company" className={inputClass} />
        <textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Testimonial quote" aria-label="Testimonial quote" required className={`${inputClass} min-h-[80px] sm:col-span-2`} />
        <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 sm:col-span-2">
          <Plus size={16} /> {saving ? "Adding..." : "Add Testimonial"}
        </button>
      </form>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

      <div className="space-y-3">
        {testimonials.length ? (
          testimonials.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border-c bg-surface p-5">
              <div>
                <p className="mb-1.5 text-sm italic text-ink-soft">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-semibold">{t.student_name}{t.role_company ? ` — ${t.role_company}` : ""}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => handleTogglePublished(t)} aria-label={t.is_published ? `Unpublish testimonial from ${t.student_name}` : `Publish testimonial from ${t.student_name}`} title={t.is_published ? "Unpublish" : "Publish"} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600">
                  {t.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => handleDelete(t)} aria-label={`Delete testimonial from ${t.student_name}`} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-ink-soft">No testimonials yet.</p>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";
