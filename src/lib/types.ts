export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
export type CourseStatus = "upcoming" | "ongoing" | "completed";

export interface Course {
  id: string;
  slug: string;
  title: string;
  category: string;
  level: CourseLevel;
  duration_weeks: number;
  price: number;
  currency: string;
  image_url: string | null;
  short_description: string;
  description: string;
  curriculum: string[];
  instructor: string;
  start_date: string | null;
  end_date: string | null;
  session_days: string | null;
  session_time: string | null;
  seats_total: number;
  seats_available: number;
  status: CourseStatus;
  created_at: string;
  updated_at: string;
}

export type CourseInsert = Omit<
  Course,
  "id" | "created_at" | "updated_at" | "slug"
> & { slug?: string };

export type CourseUpdate = Partial<CourseInsert>;

export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export interface Registration {
  id: string;
  course_id: string;
  full_name: string;
  email: string;
  phone: string;
  seats: number;
  notes: string | null;
  amount: number;
  currency: string;
  payment_status: PaymentStatus;
  myfatoorah_invoice_id: string | null;
  created_at: string;
}

export type RegistrationInsert = Omit<
  Registration,
  "id" | "created_at" | "payment_status" | "myfatoorah_invoice_id"
> & {
  payment_status?: PaymentStatus;
  myfatoorah_invoice_id?: string | null;
};
