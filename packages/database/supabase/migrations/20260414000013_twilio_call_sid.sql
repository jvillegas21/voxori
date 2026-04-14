ALTER TABLE calls ADD COLUMN IF NOT EXISTS twilio_call_sid text;
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid) WHERE twilio_call_sid IS NOT NULL;
