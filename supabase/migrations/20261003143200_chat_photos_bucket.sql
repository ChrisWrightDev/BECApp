-- =====================================================================
-- Ops Chat photos (BECApp)
-- Project: janwtypmneybfzeiauzt
--
-- DO NOT apply without review. Creates a private Storage bucket for
-- Ops Chat photos and lets photo-only messages store body as ''.
-- Does NOT add columns. Does NOT touch finance tables, orders,
-- blog_posts, clownfish, or hatch_batches.
--
-- Attachment element stored in public.messages.attachments:
-- {
--   "type": "image",
--   "bucket": "chat-photos",
--   "path": "<thread>/<yyyy>/<mm>/<uuid>.jpg",
--   "mime": "image/jpeg",
--   "width": <int>,
--   "height": <int>,
--   "size": <bytes>
-- }
--
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) private chat-photos bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-photos',
  'chat-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- (b) storage.objects policies (bucket_id = 'chat-photos')
-- authenticated: SELECT and INSERT
-- UPDATE / DELETE: owner or public.is_admin
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read chat photos" on storage.objects;
create policy "Authenticated users can read chat photos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'chat-photos');

drop policy if exists "Authenticated users can upload chat photos" on storage.objects;
create policy "Authenticated users can upload chat photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'chat-photos');

drop policy if exists "Owners and admins can update chat photos" on storage.objects;
create policy "Owners and admins can update chat photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  )
  with check (
    bucket_id = 'chat-photos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "Owners and admins can delete chat photos" on storage.objects;
create policy "Owners and admins can delete chat photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- (c) allow photo-only messages
-- body stays NOT NULL. The original check required length >= 1, which
-- rejects the empty string the client stores when a message is photos
-- only. Require either some body text or at least one attachment.
-- ---------------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.messages'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%body%'
  loop
    execute format('alter table public.messages drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.messages
  add constraint messages_body_check
  check (
    char_length(body) <= 4000
    and (
      char_length(body) >= 1
      or (
        jsonb_typeof(attachments) = 'array'
        and jsonb_array_length(attachments) > 0
      )
    )
  );

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
--
-- drop policy if exists "Authenticated users can read chat photos" on storage.objects;
-- drop policy if exists "Authenticated users can upload chat photos" on storage.objects;
-- drop policy if exists "Owners and admins can update chat photos" on storage.objects;
-- drop policy if exists "Owners and admins can delete chat photos" on storage.objects;
--
-- delete from storage.buckets where id = 'chat-photos';
--
-- alter table public.messages drop constraint if exists messages_body_check;
-- alter table public.messages
--   add constraint messages_body_check
--   check (char_length(body) between 1 and 4000);
--
-- commit;
