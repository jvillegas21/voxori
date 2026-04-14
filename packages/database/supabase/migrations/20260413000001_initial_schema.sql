-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Plan tier enum
CREATE TYPE plan_tier AS ENUM ('starter', 'professional', 'growth', 'agency');

-- User role enum
CREATE TYPE user_role AS ENUM ('super_admin', 'client_admin', 'team_member');

-- Multi-tenant account structure
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  plan plan_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id text,
  stripe_subscription_id text,
  branding jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Users belong to one tenant
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'client_admin',
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One or more agents per tenant
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  voice_id text,
  system_prompt text,
  llm_model text DEFAULT 'gpt-4o',
  is_active boolean NOT NULL DEFAULT false,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Phone numbers assigned to agents
CREATE TABLE phone_numbers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number text NOT NULL,
  twilio_sid text,
  is_active boolean NOT NULL DEFAULT true
);
