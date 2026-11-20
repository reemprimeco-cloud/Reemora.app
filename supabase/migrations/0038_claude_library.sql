-- 0038: Claude Library (مكتبة كلود) — downloadable PDF guides.
--
-- Admins upload PDFs (and an optional cover image) from /admin/library;
-- visitors browse /library and download them. Files live in the public
-- `library` bucket (or, for items shipped with the site, under /library on
-- the site itself — file_url is then a site path and storage_path is null).
-- Additive and reversible: drop the table, function, bucket policies and
-- bucket to undo.

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_ar text,
  description text,
  description_ar text,
  file_url text not null,
  storage_path text,
  file_name text not null,
  file_size bigint,
  page_count integer,
  cover_url text,
  cover_storage_path text,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_items_listing_idx on public.library_items (is_published, sort_order, created_at desc);

create or replace trigger library_items_updated_at before update on public.library_items
  for each row execute function public.set_updated_at();

alter table public.library_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'library_items' and policyname = 'Public can view published library items') then
    create policy "Public can view published library items" on public.library_items
      for select using (is_published or public.is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'library_items' and policyname = 'Admins can manage library items') then
    create policy "Admins can manage library items" on public.library_items
      for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- Counts a download of a published item. Callable by anyone (the public
-- download link), but it can only ever add one to a published row.
create or replace function public.library_record_download(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.library_items set download_count = download_count + 1 where id = p_id and is_published;
$$;
revoke all on function public.library_record_download(uuid) from public;
grant execute on function public.library_record_download(uuid) to anon, authenticated, service_role;

-- Storage: public reads, admin-only writes. 50 MB per file, PDFs + images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', true, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can view library files') then
    create policy "Public can view library files" on storage.objects
      for select using (bucket_id = 'library');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can manage library files') then
    create policy "Admins can manage library files" on storage.objects
      for all to authenticated
      using (bucket_id = 'library' and public.is_admin())
      with check (bucket_id = 'library' and public.is_admin());
  end if;
end $$;

-- First item: the AI Film Director project kit, shipped with the site.
insert into public.library_items (slug, title, title_ar, description, description_ar, file_url, file_name, file_size, page_count, cover_url, sort_order)
values (
  'ai-film-director',
  'The AI Film Director — Claude Project Kit',
  'المخرج السينمائي',
  'Set up a Claude project that works as your film director for any idea: an ad, a story, a tutorial, social content or a brand film. Step-by-step: create the project, add the instructions and brand files, connect Higgsfield, plus the full instructions text ready to copy.',
  'دليل إعداد مشروع المخرج السينمائي على Claude: مخرج سينمائي ذكي لأي موضوع — إعلان، قصة، فيديو تعليمي، محتوى سوشيال أو فيلم براند. خطوة بخطوة: إنشاء المشروع، كتابة التعليمات وإرفاق ملفات البراند، ربط Higgsfield، مع النص الكامل للتعليمات جاهزاً للنسخ.',
  '/library/ai-film-director.pdf',
  'Reemora-AI-Film-Director.pdf',
  1641215,
  7,
  '/library/ai-film-director.jpg',
  0
)
on conflict (slug) do nothing;
