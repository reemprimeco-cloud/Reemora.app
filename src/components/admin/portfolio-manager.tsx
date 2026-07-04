"use client";

import * as React from "react";
import Image from "next/image";
import { Trash2, Plus, EyeOff, Eye, Pencil, Save, X, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioItem } from "@/lib/types";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { slugify } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";

interface DraftFields {
  title: string;
  description: string;
  project_url: string;
  category: string;
  image_url: string;
}

function emptyDraft(): DraftFields {
  return { title: "", description: "", project_url: "", category: "", image_url: "" };
}

function toDraft(item: PortfolioItem): DraftFields {
  return {
    title: item.title,
    description: item.description ?? "",
    project_url: item.project_url ?? "",
    category: item.category ?? "",
    image_url: item.image_url ?? "",
  };
}

export function PortfolioManager({ initialItems }: { initialItems: PortfolioItem[] }) {
  const [items, setItems] = React.useState(initialItems);
  const [addDraft, setAddDraft] = React.useState<DraftFields>(emptyDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<DraftFields>(emptyDraft);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function uploadImage(file: File, target: "add" | "edit") {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WEBP, etc.).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }
    setError("");
    const supabase = createClient();
    const path = `portfolio/${Date.now()}-${slugify(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      showToast("error", uploadError.message);
      return;
    }
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    if (target === "add") setAddDraft((d) => ({ ...d, image_url: data.publicUrl }));
    else setEditDraft((d) => ({ ...d, image_url: data.publicUrl }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addDraft.title.trim()) {
      setError("Please enter a project title.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("portfolio")
      .insert({
        title: addDraft.title.trim(),
        description: addDraft.description.trim() || null,
        project_url: addDraft.project_url.trim() || null,
        category: addDraft.category.trim() || null,
        image_url: addDraft.image_url.trim() || null,
        display_order: items.length + 1,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => [...prev, data as PortfolioItem]);
    setAddDraft(emptyDraft());
    showToast("success", "Project added.");
  }

  function startEdit(item: PortfolioItem) {
    setEditingId(item.id);
    setEditDraft(toDraft(item));
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(emptyDraft());
  }

  async function saveEdit(id: string) {
    if (!editDraft.title.trim()) {
      setError("Please enter a project title.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    const payload = {
      title: editDraft.title.trim(),
      description: editDraft.description.trim() || null,
      project_url: editDraft.project_url.trim() || null,
      category: editDraft.category.trim() || null,
      image_url: editDraft.image_url.trim() || null,
    };
    const { error } = await supabase.from("portfolio").update(payload).eq("id", id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...payload } : it)));
    cancelEdit();
    showToast("success", "Project updated.");
  }

  async function handleTogglePublished(item: PortfolioItem) {
    const supabase = createClient();
    const { error } = await supabase.from("portfolio").update({ is_published: !item.is_published }).eq("id", item.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, is_published: !it.is_published } : it)));
  }

  async function handleDelete(item: PortfolioItem) {
    if (!(await confirm(`Delete project "${item.title}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("portfolio").delete().eq("id", item.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    showToast("success", "Project deleted.");
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-border-c bg-surface p-6 sm:grid-cols-2">
        <input value={addDraft.title} onChange={(e) => setAddDraft({ ...addDraft, title: e.target.value })} placeholder="Project title (e.g. Shlon)" aria-label="Project title" required className={inputClass} />
        <input value={addDraft.category} onChange={(e) => setAddDraft({ ...addDraft, category: e.target.value })} placeholder="Category (e.g. SaaS, HR, Fitness)" aria-label="Project category" className={inputClass} />
        <input value={addDraft.project_url} onChange={(e) => setAddDraft({ ...addDraft, project_url: e.target.value })} placeholder="https://www.example.com" aria-label="Project URL" type="url" className={`${inputClass} sm:col-span-2`} />
        <textarea value={addDraft.description} onChange={(e) => setAddDraft({ ...addDraft, description: e.target.value })} placeholder="Short description shown on the card" aria-label="Project description" className={`${inputClass} min-h-[70px] sm:col-span-2`} />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[13.5px] font-semibold">Screenshot / Cover image (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "add")} aria-label="Project image upload" className="text-sm" />
          {addDraft.image_url && (
            <div className="mt-2 relative h-24 w-40 overflow-hidden rounded-lg border border-border-c bg-blue-100">
              <Image src={addDraft.image_url} alt="Project image preview" fill className="object-cover" />
            </div>
          )}
        </div>
        <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60 sm:col-span-2">
          <Plus size={16} /> {saving && !editingId ? "Adding..." : "Add Project"}
        </button>
      </form>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} className="rounded-2xl border border-border-c bg-surface p-5">
                {isEditing ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input value={editDraft.title} onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} placeholder="Project title" aria-label="Edit title" className={inputClass} />
                    <input value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} placeholder="Category" aria-label="Edit category" className={inputClass} />
                    <input value={editDraft.project_url} onChange={(e) => setEditDraft({ ...editDraft, project_url: e.target.value })} placeholder="https://..." aria-label="Edit URL" type="url" className={`${inputClass} sm:col-span-2`} />
                    <textarea value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Short description" aria-label="Edit description" className={`${inputClass} min-h-[70px] sm:col-span-2`} />
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[13.5px] font-semibold">Replace image (optional)</label>
                      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "edit")} aria-label="Replace project image" className="text-sm" />
                      {editDraft.image_url && (
                        <div className="mt-2 relative h-24 w-40 overflow-hidden rounded-lg border border-border-c bg-blue-100">
                          <Image src={editDraft.image_url} alt="Project image preview" fill className="object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 sm:col-span-2">
                      <button onClick={() => saveEdit(item.id)} disabled={saving} className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
                        <Save size={15} /> {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-full border-2 border-border-c px-5 py-2.5 text-sm font-semibold transition hover:border-blue-400">
                        <X size={15} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {item.image_url && (
                        <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-blue-100 sm:block">
                          <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold">{item.title}</p>
                          {item.category && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">{item.category}</span>}
                          {!item.is_published && <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">Draft</span>}
                        </div>
                        {item.description && <p className="mb-1.5 text-sm text-ink-soft">{item.description}</p>}
                        {item.project_url && (
                          <a href={item.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                            {item.project_url} <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => startEdit(item)} aria-label={`Edit ${item.title}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleTogglePublished(item)} aria-label={item.is_published ? `Unpublish ${item.title}` : `Publish ${item.title}`} title={item.is_published ? "Unpublish" : "Publish"} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600">
                        {item.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button onClick={() => handleDelete(item)} aria-label={`Delete ${item.title}`} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-ink-soft">No projects yet. Add your first one above.</p>
        )}
      </div>
    </div>
  );
}
