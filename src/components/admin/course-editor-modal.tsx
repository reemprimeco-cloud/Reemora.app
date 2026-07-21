"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseCategory, CourseLevel, CourseWithRelations, Instructor } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { useCloseOnEscape } from "@/lib/use-close-on-escape";

export function CourseEditorModal({
  course,
  categories,
  instructors,
  onClose,
  onSaved,
}: {
  course: CourseWithRelations | null;
  categories: CourseCategory[];
  instructors: Instructor[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState(course?.title ?? "");
  const [categoryId, setCategoryId] = React.useState(course?.category_id ?? categories[0]?.id ?? "");
  const [instructorId, setInstructorId] = React.useState(course?.instructor_id ?? instructors[0]?.id ?? "");
  const [level, setLevel] = React.useState<CourseLevel>(course?.level ?? "Beginner");
  const [price, setPrice] = React.useState(course?.price ?? 0);
  const [currency, setCurrency] = React.useState(course?.currency ?? "KWD");
  const [durationDays, setDurationDays] = React.useState(course?.duration_days ?? 0);
  const [durationHours, setDurationHours] = React.useState(course?.duration_hours ?? 0);
  const [isPublished, setIsPublished] = React.useState(course?.is_published ?? true);
  const [registrationOpen, setRegistrationOpen] = React.useState(course?.registration_open ?? true);
  const [shortDescription, setShortDescription] = React.useState(course?.short_description ?? "");
  const [description, setDescription] = React.useState(course?.description ?? "");
  const [curriculum, setCurriculum] = React.useState((course?.curriculum ?? []).join("\n"));
  const [imageUrl, setImageUrl] = React.useState(course?.image_url ?? "");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      const path = `${Date.now()}-${slugify(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("course-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("course-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !shortDescription.trim() || !description.trim()) {
      setError("Please fill in the title and both description fields.");
      return;
    }

    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      title: trimmedTitle,
      category_id: categoryId || null,
      instructor_id: instructorId || null,
      level,
      price,
      currency,
      duration_days: durationDays,
      duration_hours: durationHours,
      // duration_weeks is a legacy column kept for backward compatibility;
      // preserve the existing value on edits, default to 0 on new rows.
      duration_weeks: course?.duration_weeks ?? 0,
      is_published: isPublished,
      registration_open: registrationOpen,
      short_description: shortDescription.trim(),
      description: description.trim(),
      curriculum: curriculum.split("\n").map((s) => s.trim()).filter(Boolean),
      image_url: imageUrl || null,
    };

    try {
      if (course) {
        const { error } = await supabase.from("courses").update(payload).eq("id", course.id);
        if (error) throw error;
      } else {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({ ...payload, slug: slugify(trimmedTitle) })
          .select()
          .single();
        if (error) throw error;

        // Every course needs at least one cohort to be registrable; seed a
        // TBA placeholder the admin can fill in from the Scheduling tab.
        const { error: scheduleError } = await supabase.from("course_schedule").insert({
          course_id: newCourse.id,
          seats_total: 20,
          seats_available: 20,
          session_days: "TBA",
          session_time: "TBA",
          status: "upcoming",
        });
        if (scheduleError) throw scheduleError;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save course.");
    } finally {
      setSaving(false);
    }
  }

  useCloseOnEscape(onClose);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/55 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="course-modal-title" className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[22px] bg-surface p-8 shadow-2xl">
        <div className="mb-5.5 flex items-center justify-between">
          <h3 id="course-modal-title" className="text-lg font-bold">{course ? "Edit Course" : "Add Course"}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-border-c">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <span className="mb-1.5 block text-[13.5px] font-semibold">Course Image</span>
            <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-c p-5 text-center hover:border-blue-400">
              {imageUrl && (
                <div className="relative h-[130px] w-full overflow-hidden rounded-lg">
                  <Image src={imageUrl} alt="Course image preview" fill className="object-cover" />
                </div>
              )}
              <p className="text-[13px] text-ink-soft">{uploading ? "Uploading..." : "Click to upload an image (optional — a branded placeholder is used if left empty)"}</p>
              <input type="file" accept="image/*" onChange={handleImageChange} aria-label="Course image upload" className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="f-title">Course Title</FieldLabel>
              <Input id="f-title" value={title} onChange={setTitle} required />
            </div>
            <div>
              <FieldLabel htmlFor="f-category">Category</FieldLabel>
              <select id="f-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className={selectClass}>
                <option value="" disabled>Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="f-level">Level</FieldLabel>
              <select id="f-level" value={level} onChange={(e) => setLevel(e.target.value as CourseLevel)} className={selectClass}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="f-price">Price</FieldLabel>
              <input id="f-price" type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} required className={selectClass} />
            </div>
            <div>
              <FieldLabel htmlFor="f-currency">Currency</FieldLabel>
              <Input id="f-currency" value={currency} onChange={setCurrency} required />
            </div>
            <div>
              <FieldLabel htmlFor="f-duration-days">Duration — Days</FieldLabel>
              <input id="f-duration-days" type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(Math.max(0, parseInt(e.target.value) || 0))} className={selectClass} />
            </div>
            <div>
              <FieldLabel htmlFor="f-duration-hours">Duration — Hours</FieldLabel>
              <input id="f-duration-hours" type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(Math.max(0, parseInt(e.target.value) || 0))} className={selectClass} />
            </div>
            <div>
              <FieldLabel htmlFor="f-instructor">Instructor</FieldLabel>
              <select id="f-instructor" value={instructorId} onChange={(e) => setInstructorId(e.target.value)} className={selectClass}>
                <option value="">Unassigned</option>
                {instructors.map((ins) => (
                  <option key={ins.id} value={ins.id}>{ins.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2.5 text-sm font-semibold">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                Published (visible on the public site)
              </label>
            </div>
            <div className="sm:col-span-2 rounded-xl border border-border-c bg-surface-alt p-4">
              <label className="flex items-center gap-2.5 text-sm font-semibold">
                <input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} />
                Registration Open (students can register &amp; pay)
              </label>
              <p className="mt-1.5 pl-6 text-xs text-ink-soft">
                Uncheck to lock this course — it stays visible and browsable, but the Register button is disabled everywhere and payment is blocked server-side until you re-open it.
              </p>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="f-short-desc">Short Description (shown on cards)</FieldLabel>
              <textarea id="f-short-desc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} required className={`${selectClass} min-h-[70px]`} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="f-description">Full Description</FieldLabel>
              <textarea id="f-description" value={description} onChange={(e) => setDescription(e.target.value)} required className={`${selectClass} min-h-[100px]`} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="f-curriculum">Curriculum (one item per line)</FieldLabel>
              <textarea id="f-curriculum" value={curriculum} onChange={(e) => setCurriculum(e.target.value)} required className={`${selectClass} min-h-[100px]`} />
            </div>
          </div>

          {!course && (
            <p className="text-[12.5px] text-ink-soft">
              A placeholder cohort (TBA dates, 20 seats) will be created automatically — adjust it from the Scheduling tab.
            </p>
          )}

          <button type="submit" disabled={saving || uploading} className="w-full rounded-full border-2 border-transparent bg-blue-500 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Course"}
          </button>
        </form>
      </div>
    </div>
  );
}

const selectClass =
  "w-full rounded-lg border border-border-c bg-surface-alt px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-surface";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-semibold">{children}</label>;
}

function Input({
  value,
  onChange,
  ...props
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} {...props} />;
}
