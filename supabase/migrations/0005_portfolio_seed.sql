-- Reemora — seed the portfolio section with the first four featured projects.
-- Safe to re-run: uses `on conflict (title) do nothing`, so existing rows
-- with the same title aren't touched. (There's no unique constraint on
-- portfolio.title yet, so this uses a where-not-exists guard instead.)

insert into public.portfolio (title, description, image_url, project_url, category, is_published, display_order)
select v.title, v.description, v.image_url, v.project_url, v.category, true, v.display_order
from (values
  ('Shlon',
   'SaaS platform launched and maintained end-to-end — built with a modern stack, cloud-first architecture and continuous delivery.',
   '/images/portfolio/shlon.svg',
   'https://www.shlon.app',
   'SaaS',
   1),
  ('Prime Rewards',
   'Loyalty and rewards platform designed to help brands drive engagement and repeat purchases with a clean, mobile-first experience.',
   '/images/portfolio/primerewds.svg',
   'https://www.primerewds.com',
   'Rewards',
   2),
  ('Prime Fit',
   'Fitness product delivering tailored workouts and progress tracking through a fast, focused mobile-friendly interface.',
   '/images/portfolio/primefit.svg',
   'https://www.primefit.manus.space',
   'Fitness',
   3),
  ('Prime HR',
   'HR management tool that streamlines employee data, requests and reporting for small and mid-sized teams.',
   '/images/portfolio/prime-hr.svg',
   'https://www.prime-hr.netlify.app',
   'HR',
   4)
) as v(title, description, image_url, project_url, category, display_order)
where not exists (
  select 1 from public.portfolio p where p.title = v.title
);
