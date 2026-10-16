"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { mediaSrc } from "@/lib/lounge/media";
import { useLanguage } from "@/lib/i18n/context";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useToast } from "@/components/toast-provider";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";
import { isSafeHttpUrl, POST_TYPES, PROJECT_CATEGORIES, PROJECT_STATUSES, MAX_POST_IMAGES } from "@/lib/lounge/validation";
import { cn } from "@/lib/utils";
import type { LoungePostRow, LoungeProjectStatus } from "@/lib/supabase/lounge.types";

export function PostComposer({ userId, existing }: { userId: string; existing?: LoungePostRow }) {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.lounge.compose;
  const f = dict.lounge.feed;
  const { showToast } = useToast();

  const [type, setType] = React.useState<LoungePostRow["type"]>(existing?.type ?? "discussion");
  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [body, setBody] = React.useState(existing?.body ?? "");
  const [projectUrl, setProjectUrl] = React.useState(existing?.project_url ?? "");
  const [projectCategory, setProjectCategory] = React.useState(existing?.project_category ?? "website");
  const [projectStatus, setProjectStatus] = React.useState<LoungeProjectStatus>(existing?.project_status ?? "completed");
  const [tools, setTools] = React.useState(existing?.tools.join(", ") ?? "");
  const [images, setImages] = React.useState<string[]>(existing ? [existing.image_url, ...existing.gallery_urls].filter((u): u is string => Boolean(u)) : []);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [banner, setBanner] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const typeLabels: Record<LoungePostRow["type"], string> = { discussion: f.typeDiscussion, question: f.typeQuestion, project: f.typeProject, milestone: f.typeMilestone, tool: f.typeTool };
  const categoryLabels: Record<string, string> = { website: t.categoryWebsite, app: t.categoryApp, ai: t.categoryAi, automation: t.categoryAutomation, productivity: t.categoryProductivity, other: t.categoryOther };
  const statusLabels: Record<string, string> = { prototype: f.statusPrototype, in_progress: f.statusInProgress, completed: f.statusCompleted };
  const showUrl = type === "project" || type === "tool";

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_POST_IMAGES - images.length;
    const files = Array.from(list).slice(0, Math.max(0, room));
    if (!files.length) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const urls: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const ext = compressed.type === "image/png" ? "png" : compressed.type === "image/webp" ? "webp" : compressed.type === "image/gif" ? "gif" : "jpg";
        const path = `${userId}/post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

  function validate() {
    const next: Record<string, string> = {};
    if (title.trim().length < 3 || title.trim().length > 140) next.title = t.titleError;
    if (body.trim().length < 3) next.body = t.bodyError;
    if (type === "project" && !isSafeHttpUrl(projectUrl.trim())) next.projectUrl = dict.lounge.profile.urlError;
    if (type === "tool" && projectUrl.trim() && !isSafeHttpUrl(projectUrl.trim())) next.projectUrl = dict.lounge.profile.urlError;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        body: body.trim(),
        projectUrl: showUrl ? projectUrl.trim() : "",
        projectCategory: type === "project" ? projectCategory : null,
        projectStatus: type === "project" ? projectStatus : null,
        tools,
        imageUrl: images[0] ?? "",
        galleryUrls: images.slice(1),
      };
      const res = await fetch(existing ? `/api/lounge/posts/${existing.id}` : "/api/lounge/posts", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setBanner(data.error || dict.lounge.common.error);
        return;
      }
      showToast("success", t.published);
      router.push(`/lounge/posts/${data.id}`);
      router.refresh();
    } catch {
      setBanner(dict.lounge.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
      {banner && <Banner type="error">{banner}</Banner>}
      <div className="grid gap-5">
        {!existing && (
          <div>
            <span className="mb-1.5 block text-[13.5px] font-semibold">{t.type}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.type}>
              {POST_TYPES.map((pt) => (
                <button key={pt} type="button" role="radio" aria-checked={type === pt} onClick={() => setType(pt)} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", type === pt ? "border-blue-400 bg-blue-100 text-blue-600" : "border-border-c bg-surface-alt hover:border-blue-400")}>
                  {typeLabels[pt]}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field id="post-title" label={t.postTitle} error={errors.title}>
          <input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={t.titlePlaceholder} className={inputClass(Boolean(errors.title))} />
        </Field>
        <Field id="post-body" label={t.body} error={errors.body}>
          <textarea id="post-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} placeholder={t.bodyPlaceholder} className={inputClass(Boolean(errors.body), "min-h-[180px]")} />
        </Field>

        {showUrl && (
          <Field id="post-url" label={type === "project" ? t.projectUrl : `${t.projectUrl} ${dict.lounge.common.optional}`} error={errors.projectUrl}>
            <input id="post-url" type="url" dir="ltr" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://" className={inputClass(Boolean(errors.projectUrl))} />
          </Field>
        )}

        {type === "project" && <p className="rounded-xl bg-blue-050 px-4 py-3 text-xs leading-relaxed text-ink-soft">{t.rightsNote}</p>}
        {type === "project" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="post-category" label={t.projectCategory}>
              <select id="post-category" value={projectCategory} onChange={(e) => setProjectCategory(e.target.value)} className={inputClass()}>
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabels[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="post-status" label={t.projectStatus}>
              <select id="post-status" value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as LoungeProjectStatus)} className={inputClass()}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <Field id="post-tools" label={`${t.projectTools} ${dict.lounge.common.optional}`} hint={t.toolsHint}>
          <input id="post-tools" value={tools} onChange={(e) => setTools(e.target.value)} className={inputClass()} />
        </Field>

        <div>
          <span className="mb-1.5 block text-[13.5px] font-semibold">
            {type === "project" ? t.gallery : t.image} <span className="font-normal text-ink-soft">{interpolate(t.maxImages, { n: MAX_POST_IMAGES })}</span>
          </span>
          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((src) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaSrc(src) ?? src} alt="" className="h-24 w-full rounded-xl border border-border-c object-cover" />
                  <button type="button" onClick={() => setImages((prev) => prev.filter((u) => u !== src))} aria-label={t.removeImage} className="absolute end-1 top-1 rounded-full bg-navy-900/80 p-1 text-white">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button type="button" disabled={uploading || images.length >= MAX_POST_IMAGES} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border-c bg-surface-alt px-5 py-2.5 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50">
            <ImagePlus size={15} aria-hidden="true" /> {uploading ? dict.lounge.profile.uploading : t.addImages}
          </button>
        </div>

        <button type="submit" disabled={saving || uploading} className="min-h-[52px] rounded-full border-2 border-transparent bg-blue-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
          {saving ? t.publishing : existing ? t.saveChanges : t.publish}
        </button>
      </div>
    </form>
  );
}
