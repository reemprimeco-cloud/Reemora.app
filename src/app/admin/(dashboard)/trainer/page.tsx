import type { Metadata } from "next";
import { getLeadInstructorForAdmin } from "@/lib/data/instructors";
import { TrainerManager } from "@/components/admin/trainer-manager";

export const metadata: Metadata = { title: "Trainer & Certificates" };

export default async function AdminTrainerPage() {
  const instructor = await getLeadInstructorForAdmin();

  return (
    <div>
      <h1 className="mb-7 text-2xl font-bold">Trainer &amp; Certificates</h1>
      <TrainerManager instructor={instructor} />
    </div>
  );
}
