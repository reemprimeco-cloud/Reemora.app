"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Course, CourseLevel } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function CourseEditorModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState(course?.title ?? "");
  const [category, setCategory] = React.useState(course?.category ?? "");
  const [level, setLevel] = React.useState<CourseLevel>(course?.level ?? "Beginner");
  const [price, setPrice] = React.useState(course?.price ?? 0);
  const [currency, setCurrency] = React.useState(course?.currency ?? "KWD");
  const [durationWeeks, setDurationWeeks] = React.useState(course?.duration_weeks ?? 4);
  const [seatsTotal, setSeatsTotal] = React.useState(course?.seats_total ?? 20);
  const [instructor, setInstructor] = React.useState(course?.instructor ?? "Reemora Certified Trainer");
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
    setSaving(true);
    setError("");

    const supabase = createClient();
    const payload = {
      title,
      category,
      level,
      price,
      currency,
      duration_weeks: durationWeeks,
      seats_total: seatsTotal,
      instructor,
      short_description: shortDescription,
      description,
      curriculum: curriculum.split("\n").map((s) => s.trim()).filter(Boolean),
      image_url: imageUrl || null,
    };

    try {
      if (course) {
        const seatsBooked = course.seats_total - course.seats_available;
        const { error } = await supabase
          .from("courses")
          .update({ ...payload, seats_available: Math.max(0, seatsTotal - seatsBooked) })
          .eq("id", course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert({
          ...payload,
          slug: slugify(title),
          seats_available: seatsTotal,
          status: "upcoming",
          start_date: null,
          end_date: null,
          session_days: "TBA",
          session_time: "TBA",
        });
        if (error) throw error;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save course.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-900/55 p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[22px] bg-surface p-8 shadow-2xl">
        <div className="mb-5.5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{course ? "Edit Course" : "Add Course"}</h3>
          <button onClick={onClose} className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-border-c">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-[13.5px] font-semibold">Course Image</label>
            <label className="relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-c p-5 text-center hover:border-blue-400">
              {imageUrl && (
                <div className="relative h-[130px] w-full overflow-hidden rounded-lg">
                  <Image src={imageUrl} alt="" fill className="object-cover" />
                </div>
              )}
              <p className="text-[13px] text-ink-soft">{uploading ? "Uploading..." : "Click to upload an image (optional — a branded placeholder is used if left empty)"}</p>
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Course Title</FieldLabel>
              <Input value={title} onChange={setTitle} required />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <Input value={category} onChange={setCategory} required placeholder="e.g. AI Development" />
            </div>
            <div>
              <FieldLabel>Level</FieldLabel>
              <select value={level} onChange={(e) => setLevel(e.target.value as CourseLevel)} className={selectClass}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            <div>
              <FieldLabel>Price</FieldLabel>
              <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} required className={selectClass} />
            </div>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <Input value={currency} onChange={setCurrency} required />
            </div>
            <div>
              <FieldLabel>Duration (weeks)</FieldLabel>
              <input type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(parseInt(e.target.value) || 1)} required className={selectClass} />
            </div>
            <div>
              <FieldLabel>Total Seats</FieldLabel>
              <input type="number" min={1} value={seatsTotal} onChange={(e) => setSeatsTotal(parseInt(e.target.value) || 1)} required className={selectClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Instructor</FieldLabel>
              <Input value={instructor} onChange={setInstructor} required />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Short Description (shown on cards)</FieldLabel>
              <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} required className={`${selectClass} min-h-[70px]`} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Full Description</FieldLabel>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className={`${selectClass} min-h-[100px]`} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Curriculum (one item per line)</FieldLabel>
              <textarea value={curriculum} onChange={(e) => setCurriculum(e.target.value)} required className={`${selectClass} min-h-[100px]`} />
            </div>
          </div>

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13.5px] font-semibold">{children}</label>;
}

function Input({
  value,
  onChange,
  ...props
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} {...props} />;
}
