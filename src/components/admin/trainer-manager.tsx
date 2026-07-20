"use client";

import * as React from "react";
import Image from "next/image";
import { Trash2, Plus, ArrowUp, ArrowDown, GraduationCap, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Certificate, InstructorWithCertificates, TimelineEntry } from "@/lib/types";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { slugify } from "@/lib/utils";

function initialTimeline(instructor: InstructorWithCertificates | null): TimelineEntry[] {
  const raw = (instructor as unknown as { timeline?: unknown } | null)?.timeline;
  return Array.isArray(raw) ? (raw as TimelineEntry[]) : [];
}

function initialSkills(instructor: InstructorWithCertificates | null): string[] {
  const raw = (instructor as unknown as { skills?: unknown } | null)?.skills;
  return Array.isArray(raw) ? (raw as string[]) : [];
}

export function TrainerManager({ instructor: initialInstructor }: { instructor: InstructorWithCertificates | null }) {
  const [instructor, setInstructor] = React.useState(initialInstructor);
  const [fullName, setFullName] = React.useState(initialInstructor?.full_name ?? "");
  const [title, setTitle] = React.useState(initialInstructor?.title ?? "");
  const [bio, setBio] = React.useState(initialInstructor?.bio ?? "");
  const [yearsExperience, setYearsExperience] = React.useState(initialInstructor?.years_experience ?? 10);
  const [photoUrl, setPhotoUrl] = React.useState(initialInstructor?.photo_url ?? "");
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>(() => initialTimeline(initialInstructor));
  const [skillsInput, setSkillsInput] = React.useState(() => initialSkills(initialInstructor).join(", "));
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [certTitle, setCertTitle] = React.useState("");
  const [certIssuer, setCertIssuer] = React.useState("");
  const [certUploading, setCertUploading] = React.useState<string | null>(null);

  function updateTimelineEntry(idx: number, patch: Partial<TimelineEntry>) {
    setTimeline((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function addTimelineEntry() {
    setTimeline((prev) => [...prev, { date: "", title: "", desc: "" }]);
  }
  function removeTimelineEntry(idx: number) {
    setTimeline((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveTimelineEntry(idx: number, dir: -1 | 1) {
    setTimeline((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WEBP, etc.).");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const supabase = createClient();
      const path = `trainer/${Date.now()}-${slugify(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const cleanTimeline = timeline
      .map((e) => ({ date: e.date.trim(), title: e.title.trim(), desc: e.desc.trim() }))
      .filter((e) => e.date || e.title || e.desc);
    const cleanSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      full_name: fullName,
      title,
      bio,
      years_experience: yearsExperience,
      photo_url: photoUrl || null,
      timeline: cleanTimeline,
      skills: cleanSkills,
      is_lead: true,
    };

    if (instructor) {
      const { error } = await supabase.from("instructors").update(payload).eq("id", instructor.id);
      setSaving(false);
      if (error) return setError(error.message);
      setInstructor({ ...instructor, ...payload });
      showToast("success", "Trainer profile updated.");
    } else {
      const { data, error } = await supabase.from("instructors").insert(payload).select().single();
      setSaving(false);
      if (error) return setError(error.message);
      setInstructor({ ...(data as InstructorWithCertificates), certificates: [] });
      showToast("success", "Trainer profile created.");
    }
  }

  async function handleCertImageUpload(cert: Certificate, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please upload an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Image must be smaller than 5MB.");
      e.target.value = "";
      return;
    }
    setCertUploading(cert.id);
    try {
      const supabase = createClient();
      const path = `certificates/${Date.now()}-${slugify(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("certificates")
        .update({ image_url: data.publicUrl })
        .eq("id", cert.id);
      if (updateError) throw updateError;
      setInstructor((prev) =>
        prev
          ? { ...prev, certificates: prev.certificates.map((c) => (c.id === cert.id ? { ...c, image_url: data.publicUrl } : c)) }
          : prev
      );
      showToast("success", "Certificate image updated.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setCertUploading(null);
      e.target.value = "";
    }
  }

  async function handleAddCertificate(e: React.FormEvent) {
    e.preventDefault();
    if (!instructor || !certTitle.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("certificates")
      .insert({ instructor_id: instructor.id, title: certTitle.trim(), issuing_body: certIssuer.trim() || null, display_order: instructor.certificates.length + 1 })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setInstructor({ ...instructor, certificates: [...instructor.certificates, data as Certificate] });
    setCertTitle("");
    setCertIssuer("");
    showToast("success", "Certificate added.");
  }

  async function handleDeleteCertificate(cert: Certificate) {
    if (!instructor) return;
    if (!(await confirm(`Delete certificate "${cert.title}"?`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setInstructor({ ...instructor, certificates: instructor.certificates.filter((c) => c.id !== cert.id) });
    showToast("success", "Certificate deleted.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h2 className="mb-5 font-bold">Trainer Profile</h2>
        {!instructor && (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
            No trainer profile in the database yet — fill in the form below and click Save to create one.
          </p>
        )}
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label htmlFor="trainer-photo" className="mb-1.5 block text-[13.5px] font-semibold">Photo</label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border-c bg-blue-100">
                {photoUrl ? (
                  <Image src={photoUrl} alt="Trainer photo preview" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-blue-600">
                    {fullName ? fullName[0]?.toUpperCase() : "?"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input id="trainer-photo" type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} aria-label="Upload trainer photo" className="text-sm" />
                <p className="mt-1 text-xs text-ink-soft">{uploading ? "Uploading..." : "PNG, JPG, or WEBP up to 5MB. Square photos work best."}</p>
                {photoUrl && (
                  <button type="button" onClick={() => setPhotoUrl("")} className="mt-1.5 text-xs font-semibold text-red-500 hover:underline">Remove photo</button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="trainer-name" className="mb-1.5 block text-[13.5px] font-semibold">Full Name</label>
            <input id="trainer-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="trainer-title" className="mb-1.5 block text-[13.5px] font-semibold">Title</label>
            <input id="trainer-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Founder & Lead Trainer" />
          </div>
          <div>
            <label htmlFor="trainer-years" className="mb-1.5 block text-[13.5px] font-semibold">Years of Experience</label>
            <input id="trainer-years" type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="trainer-bio" className="mb-1.5 block text-[13.5px] font-semibold">Bio</label>
            <textarea id="trainer-bio" value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} min-h-[140px]`} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13.5px] font-semibold">Timeline / Experience</span>
              <button type="button" onClick={addTimelineEntry} className="inline-flex items-center gap-1 rounded-full border border-border-c px-3 py-1 text-xs font-semibold hover:border-blue-400 hover:text-blue-600">
                <Plus size={13} /> Add row
              </button>
            </div>
            {timeline.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-c px-4 py-3 text-xs text-ink-soft">
                No entries yet — click <strong>Add row</strong> to add one. Each row shows on the homepage as one bullet under the trainer bio (e.g. &ldquo;2024 — Present · Founder & Lead Trainer, Reemora · Designing and delivering AI courses…&rdquo;).
              </p>
            ) : (
              <div className="space-y-2.5">
                {timeline.map((entry, idx) => (
                  <div key={idx} className="rounded-lg border border-border-c bg-surface-alt p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input value={entry.date} onChange={(e) => updateTimelineEntry(idx, { date: e.target.value })} placeholder="Date / period (e.g. 2024 — Present)" aria-label={`Timeline row ${idx + 1} date`} className={inputClass} />
                      <input value={entry.title} onChange={(e) => updateTimelineEntry(idx, { title: e.target.value })} placeholder="Title (e.g. Founder & Lead Trainer)" aria-label={`Timeline row ${idx + 1} title`} className={inputClass} />
                    </div>
                    <textarea value={entry.desc} onChange={(e) => updateTimelineEntry(idx, { desc: e.target.value })} placeholder="Short description" aria-label={`Timeline row ${idx + 1} description`} className={`${inputClass} mt-2 min-h-[60px]`} />
                    <div className="mt-2 flex justify-end gap-1">
                      <button type="button" onClick={() => moveTimelineEntry(idx, -1)} disabled={idx === 0} aria-label="Move up" className="flex h-7 w-7 items-center justify-center rounded-md border border-border-c disabled:opacity-30 hover:border-blue-400 hover:text-blue-600">
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" onClick={() => moveTimelineEntry(idx, 1)} disabled={idx === timeline.length - 1} aria-label="Move down" className="flex h-7 w-7 items-center justify-center rounded-md border border-border-c disabled:opacity-30 hover:border-blue-400 hover:text-blue-600">
                        <ArrowDown size={13} />
                      </button>
                      <button type="button" onClick={() => removeTimelineEntry(idx)} aria-label="Delete row" className="flex h-7 w-7 items-center justify-center rounded-md border border-border-c hover:border-red-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="trainer-skills" className="mb-1.5 block text-[13.5px] font-semibold">Skill chips <span className="font-normal text-ink-soft">(comma-separated)</span></label>
            <input id="trainer-skills" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="e.g. AI App Development, Prompt Engineering, Curriculum Design" className={inputClass} />
            <p className="mt-1 text-xs text-ink-soft">Shown as pill-style tags under the timeline on the homepage.</p>
          </div>

          <button type="submit" disabled={saving || uploading} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : instructor ? "Save Profile" : "Create Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h2 className="mb-5 font-bold">Certificates</h2>
        {!instructor ? (
          <p className="text-sm text-ink-soft">Save the trainer profile first, then add certificates.</p>
        ) : (
          <>
            <form onSubmit={handleAddCertificate} className="mb-5 space-y-3">
              <input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder="Certificate title" aria-label="Certificate title" className={inputClass} />
              <input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Issuing body (optional)" aria-label="Issuing body" className={inputClass} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
                <Plus size={15} /> Add Certificate
              </button>
            </form>
            {instructor.certificates.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {instructor.certificates.map((cert) => (
                  <div key={cert.id} className="overflow-hidden rounded-2xl border border-border-c bg-surface transition-all hover:shadow-lg">
                    <div className="relative flex aspect-[4/3] items-center justify-center border-b border-border-c bg-gradient-to-br from-blue-100 to-surface text-blue-500">
                      {cert.image_url ? (
                        <Image src={cert.image_url} alt={cert.title} fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
                      ) : (
                        <GraduationCap size={40} aria-hidden="true" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-1 text-[15.5px] font-bold">{cert.title}</h3>
                      <span className="text-[12.5px] text-ink-soft">
                        {cert.issuing_body || "Placeholder — replace with certificate image"}
                      </span>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-border-c bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:border-blue-400 hover:text-blue-600">
                          <Upload size={13} aria-hidden="true" />
                          {certUploading === cert.id ? "Uploading..." : cert.image_url ? "Replace image" : "Upload image"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCertImageUpload(cert, e)}
                            disabled={certUploading === cert.id}
                            className="hidden"
                            aria-label={`Upload image for ${cert.title}`}
                          />
                        </label>
                        <button
                          onClick={() => handleDeleteCertificate(cert)}
                          aria-label={`Delete certificate: ${cert.title}`}
                          title="Delete"
                          className="ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">No certificates yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";
