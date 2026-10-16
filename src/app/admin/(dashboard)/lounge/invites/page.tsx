import type { Metadata } from "next";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/seed-courses";
import { LoungeInvitesManager, type Candidate } from "@/components/admin/lounge-invites-manager";
import type { Attendee } from "@/lib/course-utils";

export const metadata: Metadata = { title: "Lounge Invitations" };
export const dynamic = "force-dynamic";

interface RegRow {
  full_name: string;
  email: string;
  phone: string;
  attendees: unknown;
  created_at: string;
  course_schedule: { courses: { title: string } | { title: string }[] | null } | { courses: { title: string } | { title: string }[] | null }[] | null;
}

function courseTitleOf(r: RegRow): string | null {
  const sched = Array.isArray(r.course_schedule) ? r.course_schedule[0] : r.course_schedule;
  const courses = sched?.courses;
  const course = Array.isArray(courses) ? courses[0] : courses;
  return course?.title ?? null;
}

/** Everyone who has ever registered for a course (including extra
 *  attendees on a multi-seat booking), de-duplicated by email, with their
 *  current Lounge state so the admin can see who still needs an invite. */
export default async function AdminLoungeInvitesPage() {
  let candidates: Candidate[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data: regs } = await supabase
      .from("registrations")
      .select("full_name, email, phone, attendees, created_at, course_schedule(courses(title))")
      .order("created_at", { ascending: false })
      .limit(2000);

    const byEmail = new Map<string, Candidate>();
    const add = (name: string, email: string, phone: string | null, course: string | null, when: string) => {
      const key = email.trim().toLowerCase();
      if (!key) return;
      const existing = byEmail.get(key);
      if (existing) {
        if (course && !existing.courses.includes(course)) existing.courses.push(course);
        if (!existing.phone && phone) existing.phone = phone;
        return;
      }
      byEmail.set(key, { key, full_name: name || key, email: key, phone: phone || null, courses: course ? [course] : [], registered_at: when, lounge: null });
    };

    for (const r of (regs ?? []) as unknown as RegRow[]) {
      const course = courseTitleOf(r);
      add(r.full_name, r.email, r.phone, course, r.created_at);
      if (Array.isArray(r.attendees)) {
        for (const a of r.attendees as Attendee[]) {
          if (a && typeof a.email === "string") add(a.full_name, a.email, a.phone ?? null, course, r.created_at);
        }
      }
    }

    // Lounge state + whether an invited account has ever signed in.
    const service = await createServiceRoleClient();
    const [{ data: members }, { data: users }] = await Promise.all([
      service.from("lounge_members").select("user_id, status, invited_at"),
      service.from("users").select("id, email"),
    ]);
    const emailById = new Map((users ?? []).map((u) => [u.id, u.email.toLowerCase()]));
    const memberByEmail = new Map<string, { status: string; invited_at: string | null }>();
    for (const m of members ?? []) {
      const email = emailById.get(m.user_id);
      if (email) memberByEmail.set(email, { status: m.status, invited_at: m.invited_at });
    }

    const lastSignIn = new Map<string, string | null>();
    try {
      const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) if (u.email) lastSignIn.set(u.email.toLowerCase(), u.last_sign_in_at ?? null);
    } catch (err) {
      console.error("listUsers:", err);
    }

    // Members who were invited by hand (not course registrants) also belong in the list.
    for (const [email, m] of memberByEmail) {
      if (!byEmail.has(email) && m.invited_at) {
        byEmail.set(email, { key: email, full_name: email, email, phone: null, courses: [], registered_at: m.invited_at, lounge: null });
      }
    }

    candidates = Array.from(byEmail.values()).map((c) => {
      const m = memberByEmail.get(c.email);
      return { ...c, lounge: m ? { status: m.status, invited_at: m.invited_at, last_sign_in_at: lastSignIn.get(c.email) ?? null } : null };
    });
    candidates.sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Lounge Invitations</h1>
      <p className="mb-7 max-w-[760px] text-sm text-ink-soft">
        Invite past course participants (or anyone, by email) straight into the Lounge. Invited people are pre-approved: they receive a link, choose a password and land in the community. Email goes through Supabase&apos;s mailer; WhatsApp links are generated here for you to send yourself.
      </p>
      <LoungeInvitesManager candidates={candidates} />
    </div>
  );
}
