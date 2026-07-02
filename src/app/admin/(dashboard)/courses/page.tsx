import { getCourses } from "@/lib/data/courses";
import { CourseManager } from "@/components/admin/course-manager";

export default async function AdminCoursesPage() {
  const courses = await getCourses();

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Manage Courses</h1>
      </div>
      <CourseManager initialCourses={courses} />
    </div>
  );
}
