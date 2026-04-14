-- Migration 011: TCPA consent fields + recording retention
-- Adds consent tracking to calls table and retention enforcement fields.

-- ================================================================
-- TCPA consent fields on calls
-- ================================================================
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS consent_given    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_state    text,
  ADD COLUMN IF NOT EXISTS recording_expires_at timestamptz;

COMMENT ON COLUMN calls.consent_given IS
  'Whether the caller gave explicit recording consent per TCPA requirements';
COMMENT ON COLUMN calls.consent_state IS
  'US state code (e.g. CA, IL) for two-party consent determination';
COMMENT ON COLUMN calls.recording_expires_at IS
  'When this recording should be purged; set by the call-ended handler based on tenant plan';

-- Index for retention purge jobs
CREATE INDEX IF NOT EXISTS idx_calls_recording_expires_at
  ON calls(recording_expires_at)
  WHERE recording_expires_at IS NOT NULL;

-- ================================================================
-- Helper: recording retention days by plan
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_recording_retention_days(p_plan text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'starter'      THEN 30
    WHEN 'professional' THEN 90
    WHEN 'growth'       THEN 180
    WHEN 'agency'       THEN 365
    ELSE 30
  END;
$$;

-- ================================================================
-- Trigger: auto-set recording_expires_at when recording_url is set
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_recording_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan          text;
  v_retention_days int;
BEGIN
  -- Only act when recording_url is being set for the first time
  IF NEW.recording_url IS NOT NULL AND OLD.recording_url IS NULL THEN
    SELECT plan INTO v_plan FROM public.tenants WHERE id = NEW.tenant_id;
    v_retention_days := get_recording_retention_days(v_plan);
    NEW.recording_expires_at := NOW() + (v_retention_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_recording_expiry ON calls;
CREATE TRIGGER trg_set_recording_expiry
  BEFORE UPDATE OF recording_url ON calls
  FOR EACH ROW EXECUTE FUNCTION public.set_recording_expiry();
