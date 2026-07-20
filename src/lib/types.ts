import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];

export type UserProfile = Tables["users"]["Row"];
export type Instructor = Tables["instructors"]["Row"];
export type Certificate = Tables["certificates"]["Row"];
export type CourseCategory = Tables["course_categories"]["Row"];
export type Course = Tables["courses"]["Row"];
export type CourseSchedule = Tables["course_schedule"]["Row"];
export type Registration = Tables["registrations"]["Row"];
export type Payment = Tables["payments"]["Row"];
export type PaymentTransaction = Tables["payment_transactions"]["Row"];
export type Testimonial = Tables["testimonials"]["Row"];
export type WebsiteSettingRow = Tables["website_settings"]["Row"];
export type PortfolioItem = Tables["portfolio"]["Row"];
export type ContactMessage = Tables["contact_messages"]["Row"];
export type CourseInquiry = Tables["course_inquiries"]["Row"];

export type CourseLevel = Course["level"];
export type ScheduleStatus = CourseSchedule["status"];
export type PaymentStatus = Payment["status"];

/** One row in the About Your Trainer timeline. Stored as JSONB on
 *  instructors.timeline so admins can edit these without a schema change. */
export interface TimelineEntry {
  date: string;
  title: string;
  desc: string;
}

/** Instructor with their certificates, as used on the homepage About/Certificates section. */
export type InstructorWithCertificates = Instructor & {
  certificates: Certificate[];
};

/** Course joined with its category, instructor and schedule cohorts — the
 *  shape used everywhere in the UI (catalog, detail page, admin). */
export type CourseWithRelations = Course & {
  category: CourseCategory | null;
  instructor: Instructor | null;
  schedules: CourseSchedule[];
};

/** Convenience shape: a course paired with the single cohort a student is
 *  registering for. */
export type CourseWithSchedule = Course & {
  category: CourseCategory | null;
  instructor: Instructor | null;
  schedule: CourseSchedule;
};

export type WebsiteSettings = {
  site_name: string;
  tagline: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  social_links: { linkedin?: string; instagram?: string; twitter?: string };
  cv_url: string;
};
