import { getCourses } from "@/lib/data/courses";
import { ScheduleManager } from "@/components/admin/schedule-manager";

export default async function AdminSchedulePage() {
  const courses = await getCourses();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Course Scheduling</h1>
      <ScheduleManager initialCourses={courses} />
    </div>
  );
}
