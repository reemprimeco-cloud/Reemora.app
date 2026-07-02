import type { Metadata } from "next";
import { getAllCoursesForAdmin } from "@/lib/data/courses";
import { getCategories } from "@/lib/data/categories";
import { getInstructors } from "@/lib/data/instructors";
import { CourseManager } from "@/components/admin/course-manager";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const [courses, categories, instructors] = await Promise.all([
    getAllCoursesForAdmin(),
    getCategories(),
    getInstructors(),
  ]);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Courses</h1>
      </div>
      <CourseManager initialCourses={courses} categories={categories} instructors={instructors} />
    </div>
  );
}
