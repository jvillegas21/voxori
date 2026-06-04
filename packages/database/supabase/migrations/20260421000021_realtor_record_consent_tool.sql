-- Add record-consent to real estate inbound template tool chain (buyer flow P0)
UPDATE agent_templates
SET default_tools = '["record-consent","log-lead","search-listings","book-showing","send-confirmation"]'::jsonb
WHERE name = 'Real Estate Inbound Receptionist'
  AND version = 1;
