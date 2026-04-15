-- Reusable, curated agent templates for tenant provisioning
CREATE TABLE agent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vertical text NOT NULL,
  description text NOT NULL,
  locked_prompt_core text NOT NULL,
  default_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_voice jsonb NOT NULL DEFAULT '{}'::jsonb,
  editable_fields_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE INDEX idx_agent_templates_vertical ON agent_templates(vertical);
CREATE INDEX idx_agent_templates_is_active ON agent_templates(is_active);

CREATE OR REPLACE FUNCTION set_agent_templates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_templates_updated_at
BEFORE UPDATE ON agent_templates
FOR EACH ROW
EXECUTE FUNCTION set_agent_templates_updated_at();

ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_templates_read_all" ON agent_templates
  FOR SELECT USING (true);

CREATE POLICY "agent_templates_admin_write" ON agent_templates
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "agent_templates_admin_update" ON agent_templates
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "agent_templates_admin_delete" ON agent_templates
  FOR DELETE USING (is_super_admin());

INSERT INTO agent_templates (
  name,
  vertical,
  description,
  locked_prompt_core,
  default_tools,
  default_voice,
  editable_fields_schema,
  version,
  is_active
) VALUES
(
  'Real Estate Inbound Receptionist',
  'realtor',
  'Answers inbound buyer and seller calls, qualifies intent, and captures contact details for follow-up.',
  'You are the front-desk voice assistant for a real estate business. Stay concise, warm, and professional. Always gather caller name, callback number, intent, timeline, and area of interest before ending.',
  '["log-lead","search-listings","book-showing","send-confirmation"]'::jsonb,
  '{"provider":"elevenlabs","voiceId":"default"}'::jsonb,
  '{
    "fields": [
      {"key":"businessName","label":"Business Name","type":"string","required":true},
      {"key":"agentOnDuty","label":"Primary Agent Name","type":"string","required":true},
      {"key":"serviceAreas","label":"Service Areas","type":"string[]","required":true},
      {"key":"timezone","label":"Timezone","type":"string","required":true},
      {"key":"officeHours","label":"Office Hours","type":"string","required":true},
      {"key":"escalationPhone","label":"Escalation Phone","type":"string","required":false}
    ]
  }'::jsonb,
  1,
  true
),
(
  'Dental Office Front Desk',
  'dental',
  'Handles new patient calls, appointment requests, and insurance/prep questions.',
  'You are the front-desk voice assistant for a dental clinic. Verify urgency, capture patient contact details, and help route appointment requests. Never provide medical diagnosis.',
  '["log-lead","check-availability","send-confirmation"]'::jsonb,
  '{"provider":"elevenlabs","voiceId":"default"}'::jsonb,
  '{
    "fields": [
      {"key":"practiceName","label":"Practice Name","type":"string","required":true},
      {"key":"dentistName","label":"Dentist Name","type":"string","required":false},
      {"key":"timezone","label":"Timezone","type":"string","required":true},
      {"key":"officeHours","label":"Office Hours","type":"string","required":true},
      {"key":"services","label":"Services","type":"string[]","required":true},
      {"key":"emergencyInstructions","label":"Emergency Instructions","type":"string","required":false}
    ]
  }'::jsonb,
  1,
  true
),
(
  'General SMB Receptionist',
  'general',
  'Captures inbound leads and routes callers for any service business.',
  'You are a receptionist assistant for a service business. Identify caller intent quickly, capture lead details, and route or schedule callbacks based on the configured business rules.',
  '["log-lead","send-confirmation"]'::jsonb,
  '{"provider":"elevenlabs","voiceId":"default"}'::jsonb,
  '{
    "fields": [
      {"key":"businessName","label":"Business Name","type":"string","required":true},
      {"key":"timezone","label":"Timezone","type":"string","required":true},
      {"key":"officeHours","label":"Office Hours","type":"string","required":true},
      {"key":"services","label":"Services","type":"string[]","required":true},
      {"key":"fallbackEscalation","label":"Fallback Escalation","type":"string","required":false}
    ]
  }'::jsonb,
  1,
  true
);
