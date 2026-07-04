import type { CourseWithRelations } from "@/lib/types";
import { isValidHttpUrl } from "@/lib/utils";

/**
 * Fallback data used only when Supabase env vars are not configured, or a
 * query fails (e.g. this environment's network policy blocking the
 * project host). Shaped to match the joined query in lib/data/courses.ts
 * so components never have to special-case seed vs. live data.
 */
const now = new Date().toISOString();

const INSTRUCTOR = {
  id: "seed-instructor-1",
  user_id: null,
  full_name: "Reemora Certified Trainer",
  title: "Founder & Lead Trainer",
  bio: "An internationally certified trainer and AI product builder dedicated to helping founders, developers and teams turn ideas into working AI applications.",
  photo_url: null,
  years_experience: 10,
  is_lead: true,
  social_links: {},
  display_order: 1,
  created_at: now,
  updated_at: now,
};

const CATEGORIES = {
  "ai-development": {
    id: "seed-cat-ai-development",
    name: "AI Development",
    slug: "ai-development",
    description: null,
    display_order: 1,
    created_at: now,
  },
  "ai-skills": {
    id: "seed-cat-ai-skills",
    name: "AI Skills",
    slug: "ai-skills",
    description: null,
    display_order: 2,
    created_at: now,
  },
  "no-code": {
    id: "seed-cat-no-code",
    name: "No-Code",
    slug: "no-code",
    description: null,
    display_order: 3,
    created_at: now,
  },
};

export const SEED_COURSES: CourseWithRelations[] = [
  {
    id: "seed-1",
    slug: "ai-app-bootcamp",
    title: "AI App Development Bootcamp",
    category_id: CATEGORIES["ai-development"].id,
    instructor_id: INSTRUCTOR.id,
    level: "Intermediate",
    duration_weeks: 6,
    price: 450,
    currency: "KWD",
    image_url: null,
    short_description:
      "Design, build and ship a full AI-powered application from scratch using modern no-code and low-code AI tools.",
    description:
      "A hands-on bootcamp where you will design, build and deploy a complete AI-powered application. You will learn to integrate large language models, connect APIs, design clean user interfaces, and launch a working product by the end of the course.",
    curriculum: [
      "Foundations of AI-assisted app building",
      "Prompt engineering for product features",
      "Connecting AI models to real applications via APIs",
      "UI/UX design for AI products",
      "Deploying and launching your app",
    ],
    is_published: true,
    created_at: now,
    updated_at: now,
    category: CATEGORIES["ai-development"],
    instructor: INSTRUCTOR,
    schedules: [
      {
        id: "seed-sched-1",
        course_id: "seed-1",
        start_date: "2026-08-10",
        end_date: "2026-09-21",
        session_days: "Sun, Tue",
        session_time: "6:00 PM - 9:00 PM",
        seats_total: 20,
        seats_available: 12,
        status: "upcoming",
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: "seed-2",
    slug: "prompt-engineering",
    title: "Prompt Engineering for Developers",
    category_id: CATEGORIES["ai-skills"].id,
    instructor_id: INSTRUCTOR.id,
    level: "Beginner",
    duration_weeks: 3,
    price: 180,
    currency: "KWD",
    image_url: null,
    short_description:
      "Master the art and science of writing prompts that get reliable, production-ready results from AI models.",
    description:
      "Learn structured prompting techniques, few-shot examples, chain-of-thought design, and evaluation methods to reliably get high quality output from AI models in real products.",
    curriculum: [
      "How large language models interpret prompts",
      "Structured prompting patterns",
      "Few-shot and chain-of-thought techniques",
      "Testing and evaluating prompt quality",
      "Building reusable prompt libraries",
    ],
    is_published: true,
    created_at: now,
    updated_at: now,
    category: CATEGORIES["ai-skills"],
    instructor: INSTRUCTOR,
    schedules: [
      {
        id: "seed-sched-2",
        course_id: "seed-2",
        start_date: "2026-08-03",
        end_date: "2026-08-24",
        session_days: "Mon, Wed",
        session_time: "5:00 PM - 7:00 PM",
        seats_total: 25,
        seats_available: 25,
        status: "upcoming",
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: "seed-3",
    slug: "ai-agents",
    title: "Building AI Agents & Automations",
    category_id: CATEGORIES["ai-development"].id,
    instructor_id: INSTRUCTOR.id,
    level: "Advanced",
    duration_weeks: 5,
    price: 380,
    currency: "KWD",
    image_url: null,
    short_description:
      "Build autonomous AI agents that plan, use tools, and automate multi-step business workflows.",
    description:
      "Go beyond chat interfaces and learn to design AI agents that can reason, call tools, and automate real workflows end-to-end. Covers agent architecture, tool-calling, memory, and safe deployment practices.",
    curriculum: [
      "Agent architecture and reasoning loops",
      "Tool-calling and function integration",
      "Memory and context management",
      "Multi-agent workflows",
      "Safety, guardrails and deployment",
    ],
    is_published: true,
    created_at: now,
    updated_at: now,
    category: CATEGORIES["ai-development"],
    instructor: INSTRUCTOR,
    schedules: [
      {
        id: "seed-sched-3",
        course_id: "seed-3",
        start_date: "2026-09-01",
        end_date: "2026-10-06",
        session_days: "Sat",
        session_time: "10:00 AM - 2:00 PM",
        seats_total: 16,
        seats_available: 9,
        status: "upcoming",
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    id: "seed-4",
    slug: "nocode-ai-apps",
    title: "No-Code AI Apps for Entrepreneurs",
    category_id: CATEGORIES["no-code"].id,
    instructor_id: INSTRUCTOR.id,
    level: "Beginner",
    duration_weeks: 4,
    price: 220,
    currency: "KWD",
    image_url: null,
    short_description:
      "Turn your idea into a working AI-powered app without writing a single line of code.",
    description:
      "Perfect for founders and business owners. Learn to combine no-code platforms with AI building blocks to launch functional products quickly, without a technical background.",
    curriculum: [
      "Choosing the right no-code stack",
      "Wiring AI features into no-code apps",
      "Databases, logic and automations",
      "Launch checklist and monetization",
    ],
    is_published: true,
    created_at: now,
    updated_at: now,
    category: CATEGORIES["no-code"],
    instructor: INSTRUCTOR,
    schedules: [
      {
        id: "seed-sched-4",
        course_id: "seed-4",
        start_date: "2026-07-20",
        end_date: "2026-08-10",
        session_days: "Tue, Thu",
        session_time: "6:30 PM - 8:30 PM",
        seats_total: 22,
        seats_available: 4,
        status: "upcoming",
        created_at: now,
        updated_at: now,
      },
    ],
  },
];

export const SEED_INSTRUCTORS = [
  {
    ...INSTRUCTOR,
    certificates: [
      { id: "seed-cert-1", instructor_id: INSTRUCTOR.id, title: "International Certified Trainer (ICT)", issuing_body: null, image_url: null, issue_date: null, credential_url: null, display_order: 1, created_at: now },
      { id: "seed-cert-2", instructor_id: INSTRUCTOR.id, title: "AI Product & Curriculum Design", issuing_body: null, image_url: null, issue_date: null, credential_url: null, display_order: 2, created_at: now },
      { id: "seed-cert-3", instructor_id: INSTRUCTOR.id, title: "Professional Training & Facilitation", issuing_body: null, image_url: null, issue_date: null, credential_url: null, display_order: 3, created_at: now },
    ],
  },
];

export const SEED_PORTFOLIO = [
  { id: "seed-p1", title: "Shlon", description: "SaaS platform launched and maintained end-to-end — built with a modern stack, cloud-first architecture and continuous delivery.", image_url: "/images/portfolio/shlon.svg", project_url: "https://www.shlon.app", category: "SaaS", is_published: true, display_order: 1, created_at: now },
  { id: "seed-p2", title: "Prime Rewards", description: "Loyalty and rewards platform designed to help brands drive engagement and repeat purchases with a clean, mobile-first experience.", image_url: "/images/portfolio/primerewds.svg", project_url: "https://www.primerewds.com", category: "Rewards", is_published: true, display_order: 2, created_at: now },
  { id: "seed-p3", title: "Prime Fit", description: "Fitness product delivering tailored workouts and progress tracking through a fast, focused mobile-friendly interface.", image_url: "/images/portfolio/primefit.svg", project_url: "https://primefit.manus.space", category: "Fitness", is_published: true, display_order: 3, created_at: now },
  { id: "seed-p4", title: "Prime HR", description: "HR management tool that streamlines employee data, requests and reporting for small and mid-sized teams.", image_url: "/images/portfolio/prime-hr.svg", project_url: "https://prime-hr.netlify.app", category: "HR", is_published: true, display_order: 4, created_at: now },
];

export const SEED_TESTIMONIALS = [
  { id: "seed-t1", student_name: "Sara A.", role_company: "Founder, Early-Stage Startup", quote: "I went from zero technical background to launching my own AI-powered app in six weeks. The hands-on approach made all the difference.", avatar_url: null, rating: 5, is_published: true, display_order: 1, created_at: now },
  { id: "seed-t2", student_name: "Faisal M.", role_company: "Software Engineer", quote: "The prompt engineering course completely changed how our development team ships AI features. Practical, structured, and immediately useful.", avatar_url: null, rating: 5, is_published: true, display_order: 2, created_at: now },
  { id: "seed-t3", student_name: "Lulwa K.", role_company: "Product Manager", quote: "Best training investment I've made. The trainer's real-world experience shows in every session.", avatar_url: null, rating: 5, is_published: true, display_order: 3, created_at: now },
];

export const SEED_SETTINGS = {
  site_name: "Reemora",
  tagline: "Build Apps with AI",
  contact_email: "hello@reemora.app",
  contact_phone: "+965 0000 0000",
  address: "Kuwait",
  social_links: { linkedin: "", instagram: "", twitter: "" },
  cv_url: "/cv/reemora-cv.pdf",
};

export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
