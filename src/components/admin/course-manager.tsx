"use client";

import * as React from "react";
import Image from "next/image";
import { Pencil, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CourseCategory, CourseWithRelations, Instructor } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { CourseEditorModal } from "@/components/admin/course-editor-modal";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-dialog";
import { courseImageSrc } from "@/lib/course-utils";

const COURSE_SELECT = "*, category:course_categories(*), instructor:instructors(*), schedules:course_schedule(*)";

export function CourseManager({
  initialCourses,
  categories,
  instructors,
}: {
  initialCourses: CourseWithRelations[];
  categories: CourseCategory[];
  instructors: Instructor[];
}) {
  const [courses, setCourses] = React.useState(initialCourses);
  const [editing, setEditing] = React.useState<CourseWithRelations | null | "new">(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.from("courses").select(COURSE_SELECT).order("created_at", { ascending: true });
    if (data) setCourses(data as unknown as CourseWithRelations[]);
  }

  async function handleDelete(course: CourseWithRelations) {
    if (!(await confirm(`Delete "${course.title}"? This cannot be undone.`))) return;
    const supabase = createClient();
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      showToast("error", error.message);
      return;
    }
    setCourses((prev) => prev.filter((c) => c.id !== course.id));
    showToast("success", `"${course.title}" deleted.`);
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-full border-2 border-transparent bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <Plus size={16} /> Add Course
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-c bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs font-bold uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-6 py-3.5 text-left">Image</th>
                <th className="px-6 py-3.5 text-left">Course</th>
                <th className="px-6 py-3.5 text-left">Category</th>
                <th className="px-6 py-3.5 text-left">Level</th>
                <th className="px-6 py-3.5 text-left">Price</th>
                <th className="px-6 py-3.5 text-left">Published</th>
                <th className="px-6 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length ? (
                courses.map((c) => (
                  <tr key={c.id} className="border-t border-border-c">
                    <td className="px-6 py-3">
                      <div className="relative h-10 w-14 overflow-hidden rounded-md bg-blue-100">
                        <Image src={courseImageSrc(c)} alt={c.title} fill className="object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium">{c.title}</td>
                    <td className="px-6 py-3">{c.category?.name ?? "—"}</td>
                    <td className="px-6 py-3">{c.level}</td>
                    <td className="px-6 py-3">{formatMoney(c.price, c.currency)}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.is_published ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-blue-100 text-blue-600"}`}>
                        {c.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditing(c)} aria-label={`Edit ${c.title}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-blue-400 hover:text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(c)} aria-label={`Delete ${c.title}`} title="Delete" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-c hover:border-red-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-ink-soft">No courses yet. Click &quot;Add Course&quot; to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <CourseEditorModal
          course={editing === "new" ? null : editing}
          categories={categories}
          instructors={instructors}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
