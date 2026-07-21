/**
 * Hand-authored to match supabase/migrations/*.sql exactly.
 * Regenerate with the Supabase CLI once the project is reachable:
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: "admin" | "student";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: "admin" | "student";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      instructors: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          title: string | null;
          bio: string | null;
          photo_url: string | null;
          years_experience: number | null;
          is_lead: boolean;
          social_links: Json;
          timeline: Json;
          skills: string[];
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          title?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          years_experience?: number | null;
          is_lead?: boolean;
          social_links?: Json;
          timeline?: Json;
          skills?: string[];
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instructors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "instructors_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      seat_reservations: {
        Row: {
          id: string;
          course_id: string | null;
          full_name: string;
          email: string;
          phone: string;
          interest: string | null;
          skills: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          full_name: string;
          email: string;
          phone: string;
          interest?: string | null;
          skills?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seat_reservations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "seat_reservations_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      course_waitlist: {
        Row: {
          id: string;
          course_id: string | null;
          course_schedule_id: string | null;
          full_name: string;
          phone: string;
          notified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          course_schedule_id?: string | null;
          full_name: string;
          phone: string;
          notified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_waitlist"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "course_waitlist_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_waitlist_course_schedule_id_fkey";
            columns: ["course_schedule_id"];
            isOneToOne: false;
            referencedRelation: "course_schedule";
            referencedColumns: ["id"];
          }
        ];
      };
      course_inquiries: {
        Row: {
          id: string;
          course_id: string | null;
          course_schedule_id: string | null;
          full_name: string;
          email: string;
          phone: string;
          message: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          course_schedule_id?: string | null;
          full_name: string;
          email: string;
          phone: string;
          message?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_inquiries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "course_inquiries_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_inquiries_course_schedule_id_fkey";
            columns: ["course_schedule_id"];
            isOneToOne: false;
            referencedRelation: "course_schedule";
            referencedColumns: ["id"];
          }
        ];
      };
      certificates: {
        Row: {
          id: string;
          instructor_id: string;
          title: string;
          issuing_body: string | null;
          image_url: string | null;
          issue_date: string | null;
          credential_url: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          title: string;
          issuing_body?: string | null;
          image_url?: string | null;
          issue_date?: string | null;
          credential_url?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["certificates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "certificates_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "instructors";
            referencedColumns: ["id"];
          }
        ];
      };
      course_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_categories"]["Insert"]>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          category_id: string | null;
          instructor_id: string | null;
          level: "Beginner" | "Intermediate" | "Advanced";
          duration_weeks: number;
          duration_days: number;
          duration_hours: number;
          price: number;
          currency: string;
          image_url: string | null;
          short_description: string;
          description: string;
          curriculum: string[];
          is_published: boolean;
          registration_open: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          category_id?: string | null;
          instructor_id?: string | null;
          level: "Beginner" | "Intermediate" | "Advanced";
          duration_weeks: number;
          duration_days?: number;
          duration_hours?: number;
          price: number;
          currency?: string;
          image_url?: string | null;
          short_description: string;
          description: string;
          curriculum?: string[];
          is_published?: boolean;
          registration_open?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "course_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_instructor_id_fkey";
            columns: ["instructor_id"];
            isOneToOne: false;
            referencedRelation: "instructors";
            referencedColumns: ["id"];
          }
        ];
      };
      course_schedule: {
        Row: {
          id: string;
          course_id: string;
          start_date: string | null;
          end_date: string | null;
          session_days: string | null;
          session_time: string | null;
          location: string | null;
          seats_total: number;
          seats_available: number;
          status: "upcoming" | "ongoing" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          start_date?: string | null;
          end_date?: string | null;
          session_days?: string | null;
          session_time?: string | null;
          location?: string | null;
          seats_total?: number;
          seats_available?: number;
          status?: "upcoming" | "ongoing" | "completed" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_schedule"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "course_schedule_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      registrations: {
        Row: {
          id: string;
          course_schedule_id: string;
          user_id: string | null;
          full_name: string;
          email: string;
          phone: string;
          seats: number;
          notes: string | null;
          amount: number;
          discount_amount: number;
          attendees: Json;
          currency: string;
          status: "pending" | "confirmed" | "cancelled" | "refunded" | "no_show" | "waitlist";
          created_at: string;
        };
        Insert: {
          id?: string;
          course_schedule_id: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          phone: string;
          seats?: number;
          notes?: string | null;
          amount: number;
          discount_amount?: number;
          attendees?: Json;
          currency?: string;
          status?: "pending" | "confirmed" | "cancelled" | "refunded" | "no_show" | "waitlist";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["registrations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "registrations_course_schedule_id_fkey";
            columns: ["course_schedule_id"];
            isOneToOne: false;
            referencedRelation: "course_schedule";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          registration_id: string;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded" | "cancelled";
          method: string;
          myfatoorah_invoice_id: string | null;
          myfatoorah_payment_id: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          amount: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded" | "cancelled";
          method?: string;
          myfatoorah_invoice_id?: string | null;
          myfatoorah_payment_id?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payments_registration_id_fkey";
            columns: ["registration_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_transactions: {
        Row: {
          id: string;
          payment_id: string;
          event_type: "created" | "callback" | "webhook" | "status_check" | "error";
          status: string | null;
          raw_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          event_type: "created" | "callback" | "webhook" | "status_check" | "error";
          status?: string | null;
          raw_response?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "payment_transactions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          }
        ];
      };
      testimonials: {
        Row: {
          id: string;
          student_name: string;
          role_company: string | null;
          quote: string;
          avatar_url: string | null;
          rating: number | null;
          is_published: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_name: string;
          role_company?: string | null;
          quote: string;
          avatar_url?: string | null;
          rating?: number | null;
          is_published?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["testimonials"]["Insert"]>;
        Relationships: [];
      };
      website_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["website_settings"]["Insert"]>;
        Relationships: [];
      };
      portfolio: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          project_url: string | null;
          category: string | null;
          is_published: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          project_url?: string | null;
          category?: string | null;
          is_published?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["portfolio"]["Insert"]>;
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      decrement_seats: {
        Args: { p_schedule_id: string; p_seats: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
