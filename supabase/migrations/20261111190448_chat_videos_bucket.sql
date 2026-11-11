-- =====================================================================
-- Ops Chat short videos (BECApp)
-- Project: janwtypmneybfzeiauzt
--
-- DO NOT apply without review. Creates a private Storage bucket for
-- Ops Chat videos. Does NOT change the chat-photos bucket, messages
-- columns, or finance / order / blog tables.
--
-- Why a separate bucket:
-- chat-photos is capped at 10 MB and allows image MIME types only.
-- A bucket has one file_size_limit, so raising chat-photos to 50 MB
-- would also allow 50 MB image uploads. chat-videos keeps the photo
-- cap and image allow-list exactly as they are, and limits videos to
-- video/mp4 and video/quicktime at 50 MB (52428800 bytes).
--
-- Access matches chat-photos: any authenticated user can read and
-- upload; only the object owner or public.is_admin can update or
-- delete. The bucket is private (signed URLs only).
--
-- Attachment element stored in public.messages.attachments:
-- {
--   "type": "video",
--   "bucket": "chat-videos",
--   "path": "<thread>/<yyyy>/<mm>/<uuid>.mp4|mov",
--   "mime": "video/mp4" | "video/quicktime",
--   "width": <int>,
--   "height": <int>,
--   "size": <bytes>,
--   "posterBucket": "chat-photos",   -- optional JPEG poster
--   "posterPath": "<thread>/<yyyy>/<mm>/<uuid>.jpg"
-- }
--
-- Project-wide upload limit (NOT set by this SQL):
-- Storage → Settings → Global file size limit must be at least
-- 52428800 bytes (50 MB). A bucket limit cannot exceed that global
-- limit. This project already has bonded-pair-videos at 500 MB, so
-- the global limit should already be high enough. Confirm it has not
-- been lowered below 50 MB before testing. Pro allows up to 500 GB.
-- Dashboard:
-- https://supabase.com/dashboard/project/janwtypmneybfzeiauzt/storage/settings
--
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) private chat-videos bucket
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-videos',
  'chat-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- (b) storage.objects policies (bucket_id = 'chat-videos')
-- authenticated: SELECT and INSERT
-- UPDATE / DELETE: owner or public.is_admin
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read chat videos" on storage.objects;
create policy "Authenticated users can read chat videos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'chat-videos');

drop policy if exists "Authenticated users can upload chat videos" on storage.objects;
create policy "Authenticated users can upload chat videos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'chat-videos');

drop policy if exists "Owners and admins can update chat videos" on storage.objects;
create policy "Owners and admins can update chat videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'chat-videos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  )
  with check (
    bucket_id = 'chat-videos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "Owners and admins can delete chat videos" on storage.objects;
create policy "Owners and admins can delete chat videos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-videos'
    and (
      owner_id = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- =====================================================================
-- begin;
--
-- drop policy if exists "Authenticated users can read chat videos" on storage.objects;
-- drop policy if exists "Authenticated users can upload chat videos" on storage.objects;
-- drop policy if exists "Owners and admins can update chat videos" on storage.objects;
-- drop policy if exists "Owners and admins can delete chat videos" on storage.objects;
--
-- delete from storage.objects where bucket_id = 'chat-videos';
-- delete from storage.buckets where id = 'chat-videos';
--
-- commit;
