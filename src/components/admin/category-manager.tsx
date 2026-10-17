"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseCategory } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";

export function CategoryManager({ initialCategories }: { initialCategories: CourseCategory[] }) {
  const [categories, setCategories] = React.useState(initialCategories);
  const [name, setName] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [arDraft, setArDraft] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category name.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_categories")
      .insert({ name: name.trim(), name_ar: nameAr.trim() || null, slug: slugify(name), display_order: categories.length + 1 })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCategories((prev) => [...prev, data as CourseCategory]);
    setName("");
    setNameAr("");
  }

  async function saveArabicName(category: CourseCategory) {
    const value = (arDraft[category.id] ?? "").trim() || null;
    const supabase = createClient();
    const { error } = await supabase.from("course_categories").update({ name_ar: value }).eq("id", category.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, name_ar: value } : c)));
    setArDraft((prev) => {
      const next = { ...prev };
      delete next[category.id];
      return next;
    });
    showToast("success", "Arabic name saved.");
  }

  async function handleDelete(category: CourseCategory) {
    if (!(await confirm(`Delete "${category.name}"? Courses using it will become uncategorized.`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_categories").delete().eq("id", category.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    showToast("success", `"${category.name}" deleted.`);
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name..."
          aria-label="New category name"
          required
          className="min-w-[240px] flex-1 rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400"
        />
        <input
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          placeholder="الاسم بالعربية (اختياري)"
          aria-label="Category name in Arabic"
          dir="rtl"
          className="min-w-[200px] flex-1 rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
        >
          <Plus size={16} /> Add Category
        </button>
      </form>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-6 py-3.5 text-left">Name</th>
              <th className="px-6 py-3.5 text-left">Arabic name</th>
              <th className="px-6 py-3.5 text-left">Slug</th>
              <th className="px-6 py-3.5 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length ? (
              categories.map((c) => (
                <tr key={c.id} className="border-t border-border-c">
                  <td className="px-6 py-3.5 font-medium">{c.name}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <input
                        dir="rtl"
                        value={arDraft[c.id] ?? c.name_ar ?? ""}
                        onChange={(e) => setArDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="—"
                        aria-label={`Arabic name for ${c.name}`}
                        className="w-44 rounded-lg border border-border-c bg-surface-alt px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                      {c.id in arDraft && (
                        <button onClick={() => saveArabicName(c)} className="rounded-full bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">Save</button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-ink-soft">{c.slug}</td>
                  <td className="px-6 py-3.5">
                    <button onClick={() => handleDelete(c)} aria-label={`Delete ${c.name}`} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-ink-soft">No categories yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
