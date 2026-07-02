-- Seed starter courses so the catalog isn't empty on first launch.
-- Safe to run multiple times (upserts on slug).

insert into public.courses (
  slug, title, category, level, duration_weeks, price, currency, image_url,
  short_description, description, curriculum, instructor,
  start_date, end_date, session_days, session_time,
  seats_total, seats_available, status
) values
(
  'ai-app-bootcamp', 'AI App Development Bootcamp', 'AI Development', 'Intermediate', 6, 450, 'KWD', null,
  'Design, build and ship a full AI-powered application from scratch using modern no-code and low-code AI tools.',
  'A hands-on bootcamp where you will design, build and deploy a complete AI-powered application. You will learn to integrate large language models, connect APIs, design clean user interfaces, and launch a working product by the end of the course.',
  array['Foundations of AI-assisted app building', 'Prompt engineering for product features', 'Connecting AI models to real applications via APIs', 'UI/UX design for AI products', 'Deploying and launching your app'],
  'Reemora Certified Trainer', '2026-08-10', '2026-09-21', 'Sun, Tue', '6:00 PM - 9:00 PM', 20, 12, 'upcoming'
),
(
  'prompt-engineering', 'Prompt Engineering for Developers', 'AI Skills', 'Beginner', 3, 180, 'KWD', null,
  'Master the art and science of writing prompts that get reliable, production-ready results from AI models.',
  'Learn structured prompting techniques, few-shot examples, chain-of-thought design, and evaluation methods to reliably get high quality output from AI models in real products.',
  array['How large language models interpret prompts', 'Structured prompting patterns', 'Few-shot and chain-of-thought techniques', 'Testing and evaluating prompt quality', 'Building reusable prompt libraries'],
  'Reemora Certified Trainer', '2026-08-03', '2026-08-24', 'Mon, Wed', '5:00 PM - 7:00 PM', 25, 25, 'upcoming'
),
(
  'ai-agents', 'Building AI Agents & Automations', 'AI Development', 'Advanced', 5, 380, 'KWD', null,
  'Build autonomous AI agents that plan, use tools, and automate multi-step business workflows.',
  'Go beyond chat interfaces and learn to design AI agents that can reason, call tools, and automate real workflows end-to-end. Covers agent architecture, tool-calling, memory, and safe deployment practices.',
  array['Agent architecture and reasoning loops', 'Tool-calling and function integration', 'Memory and context management', 'Multi-agent workflows', 'Safety, guardrails and deployment'],
  'Reemora Certified Trainer', '2026-09-01', '2026-10-06', 'Sat', '10:00 AM - 2:00 PM', 16, 9, 'upcoming'
),
(
  'nocode-ai-apps', 'No-Code AI Apps for Entrepreneurs', 'No-Code', 'Beginner', 4, 220, 'KWD', null,
  'Turn your idea into a working AI-powered app without writing a single line of code.',
  'Perfect for founders and business owners. Learn to combine no-code platforms with AI building blocks to launch functional products quickly, without a technical background.',
  array['Choosing the right no-code stack', 'Wiring AI features into no-code apps', 'Databases, logic and automations', 'Launch checklist and monetization'],
  'Reemora Certified Trainer', '2026-07-20', '2026-08-10', 'Tue, Thu', '6:30 PM - 8:30 PM', 22, 4, 'upcoming'
)
on conflict (slug) do nothing;
