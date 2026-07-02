import type { Course } from "@/lib/types";

/**
 * Fallback data used only when Supabase env vars are not configured
 * (e.g. first local run before the project is provisioned). Once
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
 * lib/data/courses.ts reads from the real `courses` table instead.
 */
export const SEED_COURSES: Course[] = [
  {
    id: "seed-1",
    slug: "ai-app-bootcamp",
    title: "AI App Development Bootcamp",
    category: "AI Development",
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
    instructor: "Reemora Certified Trainer",
    start_date: "2026-08-10",
    end_date: "2026-09-21",
    session_days: "Sun, Tue",
    session_time: "6:00 PM - 9:00 PM",
    seats_total: 20,
    seats_available: 12,
    status: "upcoming",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-2",
    slug: "prompt-engineering",
    title: "Prompt Engineering for Developers",
    category: "AI Skills",
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
    instructor: "Reemora Certified Trainer",
    start_date: "2026-08-03",
    end_date: "2026-08-24",
    session_days: "Mon, Wed",
    session_time: "5:00 PM - 7:00 PM",
    seats_total: 25,
    seats_available: 25,
    status: "upcoming",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-3",
    slug: "ai-agents",
    title: "Building AI Agents & Automations",
    category: "AI Development",
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
    instructor: "Reemora Certified Trainer",
    start_date: "2026-09-01",
    end_date: "2026-10-06",
    session_days: "Sat",
    session_time: "10:00 AM - 2:00 PM",
    seats_total: 16,
    seats_available: 9,
    status: "upcoming",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "seed-4",
    slug: "nocode-ai-apps",
    title: "No-Code AI Apps for Entrepreneurs",
    category: "No-Code",
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
    instructor: "Reemora Certified Trainer",
    start_date: "2026-07-20",
    end_date: "2026-08-10",
    session_days: "Tue, Thu",
    session_time: "6:30 PM - 8:30 PM",
    seats_total: 22,
    seats_available: 4,
    status: "upcoming",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
