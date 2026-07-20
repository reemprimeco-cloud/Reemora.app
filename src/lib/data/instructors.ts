import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { SEED_INSTRUCTORS, isSupabaseConfigured } from "@/lib/data/seed-courses";
import { toMany } from "@/lib/data/relations";
import type { Certificate, Instructor, InstructorWithCertificates } from "@/lib/types";

export async function getInstructors(): Promise<Instructor[]> {
  if (!isSupabaseConfigured) {
    return SEED_INSTRUCTORS.map((instructor) => {
      const { certificates, ...rest } = instructor;
      void certificates;
      return rest;
    });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("instructors")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getInstructors:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getLeadInstructor(): Promise<InstructorWithCertificates | null> {
  if (!isSupabaseConfigured) return SEED_INSTRUCTORS[0] ?? null;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("instructors")
    .select("*, certificates(*)")
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLeadInstructor:", error.message);
    return SEED_INSTRUCTORS[0] ?? null;
  }
  if (!data) return null;

  const row = data as Instructor & { certificates: Certificate | Certificate[] | null };
  return { ...row, certificates: toMany(row.certificates) };
}

/** Admin-only: reads directly from Supabase with NO seed-data fallback.
 *  The seed's fake IDs (`seed-instructor-1`, `seed-cert-1`) would silently
 *  break admin edits — an UPDATE keyed on a non-existent id matches zero
 *  rows and returns no error, which looks like a successful save but
 *  writes nothing. Returning null when the DB is empty forces the admin
 *  UI into "create" mode instead of "edit-a-phantom-row" mode. */
export async function getLeadInstructorForAdmin(): Promise<InstructorWithCertificates | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("instructors")
    .select("*, certificates(*)")
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLeadInstructorForAdmin:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as Instructor & { certificates: Certificate | Certificate[] | null };
  return { ...row, certificates: toMany(row.certificates) };
}
