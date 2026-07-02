"use client";

import * as React from "react";
import Image from "next/image";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Certificate, InstructorWithCertificates } from "@/lib/types";

export function TrainerManager({ instructor: initialInstructor }: { instructor: InstructorWithCertificates | null }) {
  const [instructor, setInstructor] = React.useState(initialInstructor);
  const [fullName, setFullName] = React.useState(initialInstructor?.full_name ?? "");
  const [title, setTitle] = React.useState(initialInstructor?.title ?? "");
  const [bio, setBio] = React.useState(initialInstructor?.bio ?? "");
  const [yearsExperience, setYearsExperience] = React.useState(initialInstructor?.years_experience ?? 10);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const [certTitle, setCertTitle] = React.useState("");
  const [certIssuer, setCertIssuer] = React.useState("");

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const supabase = createClient();

    const payload = { full_name: fullName, title, bio, years_experience: yearsExperience, is_lead: true };

    if (instructor) {
      const { error } = await supabase.from("instructors").update(payload).eq("id", instructor.id);
      setSaving(false);
      if (error) return setError(error.message);
      setInstructor({ ...instructor, ...payload });
    } else {
      const { data, error } = await supabase.from("instructors").insert(payload).select().single();
      setSaving(false);
      if (error) return setError(error.message);
      setInstructor({ ...(data as InstructorWithCertificates), certificates: [] });
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
  }

  async function handleDeleteCertificate(cert: Certificate) {
    if (!instructor) return;
    const supabase = createClient();
    const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
    if (error) {
      alert(error.message);
      return;
    }
    setInstructor({ ...instructor, certificates: instructor.certificates.filter((c) => c.id !== cert.id) });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h3 className="mb-5 font-bold">Trainer Profile</h3>
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Full Name</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Founder & Lead Trainer" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Years of Experience</label>
            <input type="number" min={0} value={yearsExperience} onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={`${inputClass} min-h-[140px]`} />
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-c bg-surface p-7">
        <h3 className="mb-5 font-bold">Certificates</h3>
        {!instructor ? (
          <p className="text-sm text-ink-soft">Save the trainer profile first, then add certificates.</p>
        ) : (
          <>
            <form onSubmit={handleAddCertificate} className="mb-5 space-y-3">
              <input value={certTitle} onChange={(e) => setCertTitle(e.target.value)} placeholder="Certificate title" className={inputClass} />
              <input value={certIssuer} onChange={(e) => setCertIssuer(e.target.value)} placeholder="Issuing body (optional)" className={inputClass} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">
                <Plus size={15} /> Add Certificate
              </button>
            </form>
            <ul className="space-y-2.5">
              {instructor.certificates.length ? (
                instructor.certificates.map((cert) => (
                  <li key={cert.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-c px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cert.image_url && (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-blue-100">
                          <Image src={cert.image_url} alt="" fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold">{cert.title}</p>
                        {cert.issuing_body && <p className="text-xs text-ink-soft">{cert.issuing_body}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteCertificate(cert)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))
              ) : (
                <p className="text-sm text-ink-soft">No certificates yet.</p>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";
