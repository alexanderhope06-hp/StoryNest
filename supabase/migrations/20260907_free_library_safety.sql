-- STORYNEST FREE LIBRARY — SAFE LICENSING MIGRATION
alter table public.novels
    add column if not exists license_url text,
    add column if not exists source_edition_url text,
    add column if not exists license_verified boolean not null default false,
    add column if not exists license_verified_at timestamptz,
    add column if not exists copyright_note text;

alter table public.library_imports
    add column if not exists source_type text,
    add column if not exists license text,
    add column if not exists license_verified boolean not null default false;

drop policy if exists "Public can read published free library books" on public.novels;
create policy "Public can read published free library books"
on public.novels for select to anon, authenticated
using (status = 'published' and source_type in ('cc0', 'public_domain') and license_verified = true);

drop policy if exists "Public can read chapters of published free library books" on public.chapters;
create policy "Public can read chapters of published free library books"
on public.chapters for select to anon, authenticated
using (exists (
    select 1 from public.novels n
    where n.id = chapters.novel_id
      and n.status = 'published'
      and n.source_type in ('cc0', 'public_domain')
      and n.license_verified = true
));

create index if not exists novels_free_library_idx
on public.novels (status, source_type, license_verified, title);
