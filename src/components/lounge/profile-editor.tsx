"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, isTooLarge } from "@/lib/compress-image";
import { useLanguage } from "@/lib/i18n/context";
import { useToast } from "@/components/toast-provider";
import { Avatar } from "@/components/lounge/avatar";
import { Field, Banner, inputClass } from "@/components/lounge/form-field";
import { socialLinksOf, isProfileComplete } from "@/lib/lounge/utils";
import { SOCIAL_KEYS, type SocialKey } from "@/lib/lounge/validation";
import { normalizeLink, editableValue, socialPrefix } from "@/lib/lounge/social";
import { cn } from "@/lib/utils";
import type { LoungeMemberRow } from "@/lib/supabase/lounge.types";

export function ProfileEditor({ member, email, phone }: { member: LoungeMemberRow; email: string | null; phone: string | null }) {
  const router = useRouter();
  const { dict } = useLanguage();
  const t = dict.lounge.profile;
  const { showToast } = useToast();

  const [displayName, setDisplayName] = React.useState(member.display_name);
  const [bio, setBio] = React.useState(member.bio ?? "");
  const [skills, setSkills] = React.useState(member.skills.join(", "));
  // Inputs hold what the member types (a handle or bare domain); the
  // canonical https URL is derived on validate/submit via normalizeLink().
  const [websiteUrl, setWebsiteUrl] = React.useState(() => editableValue("website", member.website_url));
  const [social, setSocial] = React.useState<Record<SocialKey, string>>(() => {
    const links = socialLinksOf(member.social_links);
    return Object.fromEntries(SOCIAL_KEYS.map((k) => [k, editableValue(k, links[k])])) as Record<SocialKey, string>;
  });
  const [showEmail, setShowEmail] = React.useState(member.show_email);
  const [showPhone, setShowPhone] = React.useState(member.show_phone);
  const [avatarUrl, setAvatarUrl] = React.useState(member.avatar_url);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [banner, setBanner] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      // Avatars never need more than ~1000px; aim well under the bucket cap.
      const compressed = await compressImage(file, { maxEdge: 1024, targetBytes: 600 * 1024 });
      if (isTooLarge(compressed)) throw new Error(t.avatarTooLarge);
      const supabase = createClient();
      const path = `${member.user_id}/avatar-${Date.now()}.${compressed.type === "image/png" ? "png" : compressed.type === "image/webp" ? "webp" : "jpg"}`;
      const { error } = await supabase.storage.from("lounge-media").upload(path, compressed, { upsert: false, contentType: compressed.type });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("lounge-media").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      // Persist immediately so the picture survives any later form error.
      const res = await fetch("/api/lounge/avatar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: data.publicUrl }) });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || dict.lounge.common.error);
      showToast("success", t.avatarSaved);
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : dict.lounge.common.error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (displayName.trim().length < 2 || displayName.trim().length > 80) next.displayName = t.displayNameError;
    if (normalizeLink("website", websiteUrl) === null) next.websiteUrl = t.urlError;
    for (const k of SOCIAL_KEYS) {
      if (normalizeLink(k, social[k]) === null) next[`socialLinks.${k}`] = t.urlError;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lounge/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio,
          skills,
          websiteUrl: normalizeLink("website", websiteUrl) ?? "",
          socialLinks: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, normalizeLink(k, social[k]) ?? ""])),
          showEmail,
          showPhone,
          avatarUrl: avatarUrl ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setBanner(data.error || dict.lounge.common.error);
        return;
      }
      showToast("success", t.saved);
      router.refresh();
    } catch {
      setBanner(dict.lounge.common.error);
    } finally {
      setSaving(false);
    }
  }

  const normalizedSocial = Object.fromEntries(SOCIAL_KEYS.map((k) => [k, normalizeLink(k, social[k]) || ""]));
  const complete = isProfileComplete({ avatar_url: avatarUrl, bio, skills: skills.split(",").map((s) => s.trim()).filter(Boolean), website_url: normalizeLink("website", websiteUrl) || null, social_links: normalizedSocial });

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[22px] border border-border-c bg-surface p-5 sm:p-8">
        {banner && <Banner type="error">{banner}</Banner>}

        <div className="mb-6 flex items-center gap-5">
          <Avatar name={displayName || member.display_name} src={avatarUrl} size="xl" />
          <div>
            <p className="mb-2 text-[13.5px] font-semibold">{t.avatar}</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleAvatar(e.target.files?.[0])} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-border-c bg-surface-alt px-4 py-2 text-sm font-semibold transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-60">
              <Camera size={15} aria-hidden="true" /> {uploading ? t.uploading : t.changeAvatar}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field id="p-name" label={t.displayName} error={errors.displayName}>
            <input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} className={inputClass(Boolean(errors.displayName))} />
          </Field>
          <Field id="p-bio" label={t.bio}>
            <textarea id="p-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={600} placeholder={t.bioPlaceholder} className={inputClass(false, "min-h-[110px]")} />
          </Field>
          <Field id="p-skills" label={t.skills} hint={t.skillsHint}>
            <input id="p-skills" value={skills} onChange={(e) => setSkills(e.target.value)} className={inputClass()} />
          </Field>
          <Field id="p-web" label={t.website} hint={t.websiteHint} error={errors.websiteUrl}>
            <PrefixedInput id="p-web" prefix={socialPrefix("website")} value={websiteUrl} onChange={setWebsiteUrl} placeholder="reemora.app" error={Boolean(errors.websiteUrl)} />
          </Field>

          <fieldset className="rounded-xl border border-border-c bg-surface-alt p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-600">{t.social}</legend>
            <p className="mb-3 text-xs text-ink-soft">{t.socialHint}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SOCIAL_KEYS.map((k) => (
                <Field key={k} id={`p-${k}`} label={t[k]} error={errors[`socialLinks.${k}`]}>
                  <PrefixedInput id={`p-${k}`} prefix={socialPrefix(k)} value={social[k]} onChange={(v) => setSocial((s) => ({ ...s, [k]: v }))} placeholder={k === "other" ? "example.com/you" : "username"} error={Boolean(errors[`socialLinks.${k}`])} className="bg-surface" />
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-border-c bg-surface-alt p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-600">{t.privacy}</legend>
            <label className="flex items-center gap-2.5 py-1.5 text-sm">
              <input type="checkbox" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)} /> {t.showEmail}
              {email && <span className="text-xs text-ink-soft" dir="ltr">({email})</span>}
            </label>
            <label className="flex items-center gap-2.5 py-1.5 text-sm">
              <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} /> {t.showPhone}
              {phone && <span className="text-xs text-ink-soft" dir="ltr">({phone})</span>}
            </label>
          </fieldset>

          <button type="submit" disabled={saving || uploading} className="min-h-[50px] rounded-full border-2 border-transparent bg-blue-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-border-c bg-surface p-5 lg:sticky lg:top-[100px]">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-soft">{dict.lounge.achievements.title}</h2>
        <p className="text-sm text-ink-soft">
          {complete ? "✅ " : "○ "}
          {dict.lounge.landing.feature3Desc}
        </p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {[
            [Boolean(avatarUrl), t.avatar],
            [bio.trim().length >= 10, t.bio],
            [skills.trim().length > 0, t.skills],
            [Boolean(websiteUrl.trim()) || SOCIAL_KEYS.some((k) => social[k].trim()), t.social],
          ].map(([ok, label]) => (
            <li key={String(label)} className={ok ? "text-green-700 dark:text-green-400" : "text-ink-soft"}>
              {ok ? "✓" : "•"} {label}
            </li>
          ))}
        </ul>
      </aside>
    </form>
  );
}

/** Text input with a fixed, non-editable prefix such as "instagram.com/",
 *  so members type only their handle. A pasted full URL still works: the
 *  prefix fades out once the value carries its own scheme. */
function PrefixedInput({
  id,
  prefix,
  value,
  onChange,
  placeholder,
  error,
  className,
}: {
  id: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}) {
  const hasScheme = /^https?:\/\//i.test(value.trim());
  return (
    <div
      dir="ltr"
      className={cn(
        "flex w-full items-center gap-1 rounded-xl border bg-surface-alt text-[15px] transition focus-within:bg-surface focus-within:ring-4 focus-within:ring-blue-400/15",
        error ? "border-red-400" : "border-border-c focus-within:border-blue-400",
        className
      )}
    >
      <span aria-hidden="true" className={cn("select-none whitespace-nowrap ps-4 text-[15px] text-ink-soft transition-opacity", hasScheme && "hidden")}>
        {prefix}
      </span>
      <input
        id={id}
        type="text"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("min-w-0 flex-1 bg-transparent py-3 pe-4 text-[15px] outline-none", hasScheme && "ps-4")}
      />
    </div>
  );
}
