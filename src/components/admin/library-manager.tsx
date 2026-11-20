"use client";

import * as React from "react";
import Image from "next/image";
import { Download, Eye, EyeOff, FileText, Pencil, Plus, Trash2, Upload, X, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { compressImage } from "@/lib/compress-image";
import { slugify } from "@/lib/utils";
import { countPdfPages, formatFileSize, safeFileName } from "@/lib/library";
import type { LibraryItem } from "@/lib/data/library";

const BUCKET = "library";
const MAX_PDF_BYTES = 50 * 1024 * 1024;

interface Draft {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  is_published: boolean;
  sort_order: string;
  pdf: File | null;
  cover: File | null;
}

const emptyDraft: Draft = { title: "", title_ar: "", description: "", description_ar: "", is_published: true, sort_order: "0", pdf: null, cover: null };

function draftFrom(item: LibraryItem): Draft {
  return {
    title: item.title,
    title_ar: item.title_ar ?? "",
    description: item.description ?? "",
    description_ar: item.description_ar ?? "",
    is_published: item.is_published,
    sort_order: String(item.sort_order),
    pdf: null,
    cover: null,
  };
}

const input = "w-full rounded-xl border border-border-c bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-blue-400";
const label = "mb-1.5 block text-xs font-semibold text-ink-soft";

type Supabase = ReturnType<typeof createClient>;

async function uploadPdf(supabase: Supabase, file: File, base: string) {
  const path = `files/${Date.now()}-${base}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);
  const pages = countPdfPages(new Uint8Array(await file.arrayBuffer()));
  return { storage_path: path, file_url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, file_size: file.size, page_count: pages };
}

async function uploadCover(supabase: Supabase, file: File, base: string) {
  const image = await compressImage(file);
  const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const path = `covers/${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, image, { contentType: image.type || "image/jpeg", cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Cover upload failed: ${error.message}`);
  return { cover_storage_path: path, cover_url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

function DraftFields({ draft, setDraft, requirePdf, idPrefix }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; requirePdf: boolean; idPrefix: string }) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-pdf`} className={label}>{requirePdf ? "PDF file *" : "Replace PDF (optional)"}</label>
        <input id={`${idPrefix}-pdf`} type="file" accept="application/pdf,.pdf" required={requirePdf} onChange={(e) => set("pdf", e.target.files?.[0] ?? null)} className={`${input} file:me-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-600`} />
        {draft.pdf && <p className="mt-1 text-xs text-ink-soft">{draft.pdf.name} · {formatFileSize(draft.pdf.size)}</p>}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-cover`} className={label}>Cover image (optional, portrait works best)</label>
        <input id={`${idPrefix}-cover`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => set("cover", e.target.files?.[0] ?? null)} className={`${input} file:me-3 file:rounded-full file:border-0 file:bg-blue-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blue-600`} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-title`} className={label}>Title (English) *</label>
        <input id={`${idPrefix}-title`} required maxLength={160} value={draft.title} onChange={(e) => set("title", e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-title-ar`} className={label}>العنوان (عربي)</label>
        <input id={`${idPrefix}-title-ar`} dir="rtl" maxLength={160} value={draft.title_ar} onChange={(e) => set("title_ar", e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-desc`} className={label}>Description (English)</label>
        <textarea id={`${idPrefix}-desc`} rows={4} maxLength={1200} value={draft.description} onChange={(e) => set("description", e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-desc-ar`} className={label}>الوصف (عربي)</label>
        <textarea id={`${idPrefix}-desc-ar`} dir="rtl" rows={4} maxLength={1200} value={draft.description_ar} onChange={(e) => set("description_ar", e.target.value)} className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.is_published} onChange={(e) => set("is_published", e.target.checked)} className="h-4 w-4 accent-blue-500" />
          Published (visible on /library)
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          Order
          <input type="number" inputMode="numeric" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} className="w-20 rounded-xl border border-border-c bg-surface px-3 py-2.5 text-sm outline-none focus:border-blue-400" aria-describedby={`${idPrefix}-order-help`} />
          <span id={`${idPrefix}-order-help`} className="text-xs font-normal text-ink-soft">lower shows first</span>
        </label>
      </div>
    </div>
  );
}

export function LibraryManager({ initialItems }: { initialItems: LibraryItem[] }) {
  const [items, setItems] = React.useState(initialItems);
  const [adding, setAdding] = React.useState(initialItems.length === 0);
  const [addDraft, setAddDraft] = React.useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<Draft>(emptyDraft);
  const [busy, setBusy] = React.useState<string | null>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  function checkPdf(file: File | null): string | null {
    if (!file) return null;
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "Please choose a PDF file.";
    if (file.size > MAX_PDF_BYTES) return "That PDF is larger than 50 MB. Compress it and try again.";
    return null;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkPdf(addDraft.pdf);
    if (!addDraft.pdf || problem) {
      showToast("error", problem ?? "Choose the PDF to upload.");
      return;
    }
    setBusy("add");
    const supabase = createClient();
    const base = slugify(addDraft.title).slice(0, 60);
    const uploaded: string[] = [];
    try {
      const pdf = await uploadPdf(supabase, addDraft.pdf, base);
      uploaded.push(pdf.storage_path);
      const cover = addDraft.cover ? await uploadCover(supabase, addDraft.cover, base) : null;
      if (cover) uploaded.push(cover.cover_storage_path);

      const row = {
        title: addDraft.title.trim(),
        title_ar: addDraft.title_ar.trim() || null,
        description: addDraft.description.trim() || null,
        description_ar: addDraft.description_ar.trim() || null,
        is_published: addDraft.is_published,
        sort_order: Number.parseInt(addDraft.sort_order, 10) || 0,
        file_name: safeFileName(`Reemora-${addDraft.title}`),
        ...pdf,
        ...(cover ?? {}),
      };
      let { data, error } = await supabase.from("library_items").insert({ ...row, slug: base }).select("*").single();
      if (error?.code === "23505") {
        ({ data, error } = await supabase.from("library_items").insert({ ...row, slug: `${base}-${Date.now().toString(36)}` }).select("*").single());
      }
      if (error || !data) throw new Error(error?.message ?? "Could not save the guide.");
      setItems((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)));
      setAddDraft(emptyDraft);
      setAdding(false);
      showToast("success", data.is_published ? "Guide added and live on /library." : "Guide saved (hidden).");
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      showToast("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave(item: LibraryItem) {
    const problem = checkPdf(editDraft.pdf);
    if (problem) {
      showToast("error", problem);
      return;
    }
    setBusy(item.id);
    const supabase = createClient();
    const base = item.slug.slice(0, 60);
    const uploaded: string[] = [];
    try {
      const pdf = editDraft.pdf ? await uploadPdf(supabase, editDraft.pdf, base) : null;
      if (pdf) uploaded.push(pdf.storage_path);
      const cover = editDraft.cover ? await uploadCover(supabase, editDraft.cover, base) : null;
      if (cover) uploaded.push(cover.cover_storage_path);
      const { data, error } = await supabase
        .from("library_items")
        .update({
          title: editDraft.title.trim(),
          title_ar: editDraft.title_ar.trim() || null,
          description: editDraft.description.trim() || null,
          description_ar: editDraft.description_ar.trim() || null,
          is_published: editDraft.is_published,
          sort_order: Number.parseInt(editDraft.sort_order, 10) || 0,
          ...(pdf ?? {}),
          ...(cover ?? {}),
        })
        .eq("id", item.id)
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not save.");
      // The replaced files are no longer referenced; clean them up.
      const stale = [pdf && item.storage_path, cover && item.cover_storage_path].filter((p): p is string => Boolean(p));
      if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
      setItems((prev) => prev.map((row) => (row.id === item.id ? data : row)).sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at)));
      setEditingId(null);
      showToast("success", "Saved.");
    } catch (err) {
      if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
      showToast("error", err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function togglePublished(item: LibraryItem) {
    setBusy(item.id);
    const supabase = createClient();
    const { data, error } = await supabase.from("library_items").update({ is_published: !item.is_published }).eq("id", item.id).select("*").single();
    setBusy(null);
    if (error || !data) {
      showToast("error", error?.message ?? "Could not update.");
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === item.id ? data : row)));
    showToast("success", data.is_published ? "Now visible on /library." : "Hidden from /library.");
  }

  async function handleDelete(item: LibraryItem) {
    if (!(await confirm(`Delete "${item.title}" from the Claude Library? The file is removed and its download link stops working.`, "Delete guide"))) return;
    setBusy(item.id);
    const supabase = createClient();
    const { error } = await supabase.from("library_items").delete().eq("id", item.id);
    if (error) {
      setBusy(null);
      showToast("error", error.message);
      return;
    }
    const files = [item.storage_path, item.cover_storage_path].filter((p): p is string => Boolean(p));
    if (files.length) await supabase.storage.from(BUCKET).remove(files);
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    setBusy(null);
    showToast("success", "Guide deleted.");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[640px] text-sm text-ink-soft">
          Downloadable PDF guides shown on <a href="/library" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">/library</a> (مكتبة كلود). Arabic visitors see the Arabic title and description when you fill them in.
        </p>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
            <Plus size={16} aria-hidden="true" /> Add a guide
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-8 rounded-[22px] border border-border-c bg-surface p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Add a guide</h2>
            {items.length > 0 && (
              <button type="button" onClick={() => setAdding(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:text-foreground">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <DraftFields draft={addDraft} setDraft={setAddDraft} requirePdf idPrefix="add" />
          <button type="submit" disabled={busy === "add"} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60">
            <Upload size={16} aria-hidden="true" /> {busy === "add" ? "Uploading…" : "Upload and save"}
          </button>
        </form>
      )}

      {items.length === 0 ? (
        !adding && <p className="rounded-[22px] border border-dashed border-border-c bg-surface px-6 py-12 text-center text-ink-soft">No guides yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {items.map((item) => {
            const editing = editingId === item.id;
            const isBusy = busy === item.id;
            const meta = ["PDF", item.page_count ? `${item.page_count} pages` : null, formatFileSize(item.file_size) || null, `${item.download_count} download${item.download_count === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
            return (
              <li key={item.id} className="rounded-[22px] border border-border-c bg-surface p-4 sm:p-5">
                <div className="flex gap-4">
                  <div className="relative aspect-[210/297] w-20 shrink-0 overflow-hidden rounded-lg bg-navy-900 sm:w-24">
                    {item.cover_url ? (
                      <Image src={item.cover_url} alt="" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/80"><FileText size={28} aria-hidden="true" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-bold leading-snug">{item.title}</h3>
                      {!item.is_published && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">Hidden</span>}
                    </div>
                    {item.title_ar && <p dir="rtl" className="mb-1 text-start text-sm font-semibold text-ink-soft">{item.title_ar}</p>}
                    <p className="mb-3 text-xs text-ink-soft">{meta}</p>
                    <div className="flex flex-wrap gap-2">
                      <a href={`/library/${encodeURIComponent(item.slug)}/download`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-blue-400 hover:text-blue-600">
                        <Download size={14} aria-hidden="true" /> Download
                      </a>
                      <a href={item.file_url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-blue-400 hover:text-blue-600">
                        <ExternalLink size={14} aria-hidden="true" /> Open file
                      </a>
                      <button type="button" disabled={isBusy} onClick={() => { setEditingId(editing ? null : item.id); setEditDraft(draftFrom(item)); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-blue-400 hover:text-blue-600 disabled:opacity-50" aria-expanded={editing}>
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => togglePublished(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-amber-400 hover:text-amber-600 disabled:opacity-50">
                        {item.is_published ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {item.is_published ? "Hide" : "Publish"}
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => handleDelete(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-c px-3 py-1.5 text-xs font-semibold hover:border-red-300 hover:text-red-500 disabled:opacity-50">
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
                {editing && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSave(item);
                    }}
                    className="mt-5 border-t border-border-c pt-5"
                  >
                    <DraftFields draft={editDraft} setDraft={setEditDraft} requirePdf={false} idPrefix={`edit-${item.id}`} />
                    <div className="mt-5 flex gap-3">
                      <button type="submit" disabled={isBusy} className="inline-flex min-h-11 items-center rounded-full bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60">
                        {isBusy ? "Saving…" : "Save changes"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="inline-flex min-h-11 items-center rounded-full border-2 border-border-c px-5 py-2.5 text-sm font-semibold hover:border-blue-400">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
