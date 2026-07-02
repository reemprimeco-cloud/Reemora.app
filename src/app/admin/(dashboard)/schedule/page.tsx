import { getAllCoursesForAdmin } from "@/lib/data/courses";
import { ScheduleManager } from "@/components/admin/schedule-manager";

export default async function AdminSchedulePage() {
  const courses = await getAllCoursesForAdmin();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Course Scheduling</h1>
      <ScheduleManager courses={courses} />
    </div>
  );
}
