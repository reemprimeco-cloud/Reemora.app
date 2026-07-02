-- Reemora training platform — starter content
-- Safe to re-run: every insert is keyed on a unique natural key with
-- `on conflict do nothing`.

-- ---------- course_categories ----------
insert into public.course_categories (name, slug, description, display_order) values
  ('AI Development', 'ai-development', 'Building full AI-powered applications end to end.', 1),
  ('AI Skills', 'ai-skills', 'Focused skills like prompt engineering and evaluation.', 2),
  ('No-Code', 'no-code', 'Building AI apps without writing code.', 3)
on conflict (slug) do nothing;

-- ---------- instructors ----------
insert into public.instructors (id, full_name, title, bio, years_experience, is_lead, display_order)
values (
  '00000000-0000-0000-0000-000000000001',
  'Reemora Certified Trainer',
  'Founder & Lead Trainer',
  'An internationally certified trainer and AI product builder dedicated to helping founders, developers and teams turn ideas into working AI applications. Combines hands-on software development experience with a certified training methodology to make complex AI concepts practical and immediately usable.',
  10,
  true,
  1
)
on conflict (id) do nothing;

-- ---------- certificates ----------
insert into public.certificates (instructor_id, title, issuing_body, display_order) values
  ('00000000-0000-0000-0000-000000000001', 'International Certified Trainer (ICT)', null, 1),
  ('00000000-0000-0000-0000-000000000001', 'AI Product & Curriculum Design', null, 2),
  ('00000000-0000-0000-0000-000000000001', 'Professional Training & Facilitation', null, 3)
on conflict do nothing;

-- ---------- courses + course_schedule ----------
with cat as (select id, slug from public.course_categories),
     ins as (select '00000000-0000-0000-0000-000000000001'::uuid as id),
     inserted_courses as (
       insert into public.courses (
         slug, title, category_id, instructor_id, level, duration_weeks, price, currency,
         short_description, description, curriculum
       )
       select v.slug, v.title, cat.id, ins.id, v.level, v.duration_weeks, v.price, v.currency,
              v.short_description, v.description, v.curriculum
       from (values
         (
           'ai-app-bootcamp', 'AI App Development Bootcamp', 'ai-development', 'Intermediate', 6, 450.00, 'KWD',
           'Design, build and ship a full AI-powered application from scratch using modern no-code and low-code AI tools.',
           'A hands-on bootcamp where you will design, build and deploy a complete AI-powered application. You will learn to integrate large language models, connect APIs, design clean user interfaces, and launch a working product by the end of the course.',
           array['Foundations of AI-assisted app building', 'Prompt engineering for product features', 'Connecting AI models to real applications via APIs', 'UI/UX design for AI products', 'Deploying and launching your app']
         ),
         (
           'prompt-engineering', 'Prompt Engineering for Developers', 'ai-skills', 'Beginner', 3, 180.00, 'KWD',
           'Master the art and science of writing prompts that get reliable, production-ready results from AI models.',
           'Learn structured prompting techniques, few-shot examples, chain-of-thought design, and evaluation methods to reliably get high quality output from AI models in real products.',
           array['How large language models interpret prompts', 'Structured prompting patterns', 'Few-shot and chain-of-thought techniques', 'Testing and evaluating prompt quality', 'Building reusable prompt libraries']
         ),
         (
           'ai-agents', 'Building AI Agents & Automations', 'ai-development', 'Advanced', 5, 380.00, 'KWD',
           'Build autonomous AI agents that plan, use tools, and automate multi-step business workflows.',
           'Go beyond chat interfaces and learn to design AI agents that can reason, call tools, and automate real workflows end-to-end. Covers agent architecture, tool-calling, memory, and safe deployment practices.',
           array['Agent architecture and reasoning loops', 'Tool-calling and function integration', 'Memory and context management', 'Multi-agent workflows', 'Safety, guardrails and deployment']
         ),
         (
           'nocode-ai-apps', 'No-Code AI Apps for Entrepreneurs', 'no-code', 'Beginner', 4, 220.00, 'KWD',
           'Turn your idea into a working AI-powered app without writing a single line of code.',
           'Perfect for founders and business owners. Learn to combine no-code platforms with AI building blocks to launch functional products quickly, without a technical background.',
           array['Choosing the right no-code stack', 'Wiring AI features into no-code apps', 'Databases, logic and automations', 'Launch checklist and monetization']
         )
       ) as v(slug, title, category_slug, level, duration_weeks, price, currency, short_description, description, curriculum)
       join cat on cat.slug = v.category_slug
       cross join ins
       on conflict (slug) do nothing
       returning id, slug
     )
insert into public.course_schedule (course_id, start_date, end_date, session_days, session_time, seats_total, seats_available, status)
select c.id, s.start_date, s.end_date, s.session_days, s.session_time, s.seats_total, s.seats_available, 'upcoming'
from inserted_courses c
join (values
  ('ai-app-bootcamp', date '2026-08-10', date '2026-09-21', 'Sun, Tue', '6:00 PM - 9:00 PM', 20, 12),
  ('prompt-engineering', date '2026-08-03', date '2026-08-24', 'Mon, Wed', '5:00 PM - 7:00 PM', 25, 25),
  ('ai-agents', date '2026-09-01', date '2026-10-06', 'Sat', '10:00 AM - 2:00 PM', 16, 9),
  ('nocode-ai-apps', date '2026-07-20', date '2026-08-10', 'Tue, Thu', '6:30 PM - 8:30 PM', 22, 4)
) as s(slug, start_date, end_date, session_days, session_time, seats_total, seats_available)
  on s.slug = c.slug;

-- ---------- testimonials ----------
insert into public.testimonials (student_name, role_company, quote, rating, display_order) values
  ('Sara A.', 'Founder, Early-Stage Startup', 'I went from zero technical background to launching my own AI-powered app in six weeks. The hands-on approach made all the difference.', 5, 1),
  ('Faisal M.', 'Software Engineer', 'The prompt engineering course completely changed how our development team ships AI features. Practical, structured, and immediately useful.', 5, 2),
  ('Lulwa K.', 'Product Manager', 'Best training investment I''ve made. The trainer''s real-world experience shows in every session.', 5, 3)
on conflict do nothing;

-- ---------- website_settings ----------
insert into public.website_settings (key, value) values
  ('site_name', '"Reemora"'),
  ('tagline', '"Build Apps with AI"'),
  ('contact_email', '"hello@reemora.app"'),
  ('contact_phone', '"+965 0000 0000"'),
  ('address', '"Kuwait"'),
  ('social_links', '{"linkedin": "", "instagram": "", "twitter": ""}'),
  ('cv_url', '"/cv/reemora-cv.pdf"')
on conflict (key) do nothing;

-- ---------- promote an admin (manual step) ----------
-- 1. Create the admin user in Supabase Dashboard -> Authentication -> Add user
--    (or have them sign up through the app).
-- 2. Then run, substituting the real email:
--
--   update public.users set role = 'admin' where email = 'admin@reemora.app';
