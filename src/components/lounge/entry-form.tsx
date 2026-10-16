"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";
import { isSafeHttpUrl, MAX_POST_IMAGES } from "@/lib/lounge/validation";
import type { LoungeChallengeEntryRow, LoungeChallengeRow } from "@/lib/supabase/lounge.types";

export function EntryForm({ challenge, userId, existing, onDone }: { challenge: LoungeChallengeRow; userId: string; existing: LoungeChallengeEntryRow | null; onDone?: () => void }) {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.lounge.challenges;
  const { showToast } = useToast();

  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [description, setDescription] = React.useState(existing?.description ?? "");
  const [projectUrl, setProjectUrl] = React.useState(existing?.project_url ?? "");
  const [tools, setTools] = React.useState(existing?.tools.join(", ") ?? "");
  const [category, setCategory] = React.useState(existing?.category ?? challenge.categories[0] ?? "");
  const [images, setImages] = React.useState<string[]>(existing ? [existing.image_url, ...existing.gallery_urls].filter((u): u is string => Boolean(u)) : []);
  const [confirmed, setConfirmed] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [banner, setBanner] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of Array.from(list).slice(0, MAX_POST_IMAGES - images.length)) {
        const compressed = await compressImage(file);
        const ext = compressed.type === "image/png" ? "png" : compressed.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("lounge-media").upload(path, compressed, { contentType: compressed.type });
        if (error) throw new Error(error.message);
        urls.push(supabase.storage.from("lounge-media").getPublicUrl(path).data.publicUrl);
      }
      setImages((prev) => [...prev, ...urls].slice(0, MAX_POST_IMAGES));
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = dict.lounge.compose.titleError;
    if (description.trim().length < 10) next.description = dict.lounge.compose.bodyError;
    if (!isSafeHttpUrl(projectUrl.trim())) next.projectUrl = dict.lounge.profile.urlError;
    if (!confirmed) next.ownershipConfirmed = t.entryOwnership;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/lounge/challenges/${challenge.id}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.id,
          title: title.trim(),
          description: description.trim(),
          projectUrl: projectUrl.trim(),
          imageUrl: images[0] ?? "",
          galleryUrls: images.slice(1),
          tools,
          category,
          ownershipConfirmed: confirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setBanner(data.error || dict.lounge.common.error);
        return;
      }
      showToast("success", t.entrySaved);
      onDone?.();
      router.refresh();
    } catch {
      setBanner(dict.lounge.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-7">
      <h2 className="mb-4 text-lg font-bold">{existing ? dict.lounge.feed.edit : t.enter}</h2>
      {banner && <Banner type="error">{banner}</Banner>}
      <div className="grid gap-4">
        <Field id="e-title" label={t.entryTitle} error={errors.title}>
          <input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className={inputClass(Boolean(errors.title))} />
        </Field>
        <Field id="e-desc" label={t.entryDescription} error={errors.description}>
          <textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} className={inputClass(Boolean(errors.description), "min-h-[120px]")} />
        </Field>
        <Field id="e-url" label={t.entryUrl} error={errors.projectUrl}>
          <input id="e-url" type="url" dir="ltr" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://" className={inputClass(Boolean(errors.projectUrl))} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="e-tools" label={t.entryTools} hint={dict.lounge.compose.toolsHint}>
            <input id="e-tools" value={tools} onChange={(e) => setTools(e.target.value)} className={inputClass()} />
          </Field>
          <Field id="e-cat" label={t.entryCategory}>
            {challenge.categories.length > 0 ? (
              <select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass()}>
                {challenge.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} className={inputClass()} />
            )}
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-[13.5px] font-semibold">{t.entryImage}</span>
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((src) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-24 w-full rounded-xl border border-border-c object-cover" />
                  <button type="button" onClick={() => setImages((p) => p.filter((u) => u !== src))} aria-label={dict.lounge.compose.removeImage} className="absolute end-1 top-1 rounded-full bg-navy-900/80 p-1 text-white">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button type="button" disabled={uploading || images.length >= MAX_POST_IMAGES} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border-c bg-surface-alt px-5 py-2.5 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
            <ImagePlus size={15} aria-hidden="true" /> {uploading ? dict.lounge.profile.uploading : dict.lounge.compose.addImages}
          </button>
        </div>
        <div>
          <label className="flex items-start gap-2.5 text-[13.5px] text-ink-soft">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /> {t.entryOwnership}
          </label>
          {errors.ownershipConfirmed && <p className="mt-1 text-xs text-red-500">{errors.ownershipConfirmed}</p>}
        </div>
        <button type="submit" disabled={saving || uploading} className="min-h-[50px] rounded-full border-2 border-transparent bg-blue-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {saving ? t.entrySubmitting : t.entrySubmit}
        </button>
      </div>
    </form>
  );
}
