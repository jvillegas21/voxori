-- Migration 010: Recordings storage bucket
-- Creates a private Supabase Storage bucket for call recordings.
-- Recordings are stored at: tenants/{tenant_id}/calls/{call_id}/recording.mp3
-- Access is tenant-scoped; service role handles all writes.
--
-- Storage URL path format: tenants/{tenant_id}/calls/{call_id}/recording.mp3
-- storage.foldername(name) returns an array: ['tenants', tenant_id, 'calls', ...]
-- So index [2] (1-based in Postgres) = tenant_id component of the path.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,         -- private bucket: never publicly accessible
  52428800,      -- 50MB max per file
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- Tenants can read recordings within their own tenant path
-- Path: tenants/{tenant_id}/... → foldername array index 2 = tenant_id
CREATE POLICY "recordings_tenant_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings'
    AND (storage.foldername(name))[2] = auth_tenant_id()::text
  );

-- Only service role can insert (webhook migration job, never from browser)
CREATE POLICY "recordings_service_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings'
    AND auth.role() = 'service_role'
  );
