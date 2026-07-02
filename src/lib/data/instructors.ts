import { createPublicClient } from "@/lib/supabase/public";
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
