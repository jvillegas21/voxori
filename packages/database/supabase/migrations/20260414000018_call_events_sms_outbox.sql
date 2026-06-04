-- Call ↔ Vapi linkage, tool event dedupe, post-call SMS outbox, phone_numbers hygiene

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS vapi_call_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_vapi_call_id
  ON calls (vapi_call_id)
  WHERE vapi_call_id IS NOT NULL;

ALTER TABLE call_tool_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE call_tool_events
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE call_tool_events
  DROP CONSTRAINT IF EXISTS call_tool_events_status_check;

ALTER TABLE call_tool_events
  ADD CONSTRAINT call_tool_events_status_check
  CHECK (status IS NULL OR status IN ('success', 'error'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_call_tool_events_idempotency
  ON call_tool_events (call_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS sms_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_id         uuid REFERENCES calls(id) ON DELETE SET NULL,
  sms_type        text NOT NULL,
  to_phone        text NOT NULL,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  twilio_sid      text,
  idempotency_key text NOT NULL,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  UNIQUE (call_id, sms_type)
);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_tenant_status
  ON sms_outbox (tenant_id, status);

ALTER TABLE sms_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_outbox_isolation" ON sms_outbox
  FOR ALL USING (tenant_id = auth_tenant_id() OR is_super_admin());

ALTER TABLE phone_numbers
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_numbers_tenant_number
  ON phone_numbers (tenant_id, number);
