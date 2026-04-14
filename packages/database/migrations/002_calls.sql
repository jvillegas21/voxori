-- Call status enum
CREATE TYPE call_status AS ENUM ('completed', 'missed', 'failed');

-- Call outcome enum
CREATE TYPE call_outcome AS ENUM ('scheduled', 'callback_requested', 'unqualified', 'info_only');

-- Every inbound call
CREATE TABLE calls (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  caller_number text,
  duration_seconds int,
  status call_status NOT NULL DEFAULT 'completed',
  outcome call_outcome,
  recording_url text,
  transcript text,
  summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

-- Tool calls made during a call
CREATE TABLE call_tool_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id uuid NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  input jsonb,
  output jsonb,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX idx_calls_agent_id ON calls(agent_id);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_call_tool_events_call_id ON call_tool_events(call_id);
