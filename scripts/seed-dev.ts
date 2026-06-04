/**
 * Idempotent dev seed: Austin / Central Texas sample leads + listings.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 * (loaded from .env.local or apps/api/.env.local).
 *
 * Uses fixed UUIDs so re-running upserts the same dev tenant/agent/data.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from '../packages/database/src/types';
import { DEFAULT_LAUNCH_MLS_MARKET, MLS_MARKET_IDS } from '../packages/shared/src/constants/mls-markets';
import { encryptCredentials } from '../apps/api/lib/services/credentials';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Well-known dev IDs — safe to reuse locally; do not use in production. */
const DEV = {
  tenantId: '11111111-1111-4111-8111-111111111101',
  agentId: '11111111-1111-4111-8111-111111111102',
  integrationId: '11111111-1111-4111-8111-111111111103',
  ctxIntegrationId: '11111111-1111-4111-8111-111111111104',
  callId: '44444444-4444-4444-8444-444444444401',
} as const;

function loadEnvFiles(): void {
  const candidates = [
    resolve(ROOT, '.env.local'),
    resolve(ROOT, 'apps/api/.env.local'),
    resolve(ROOT, 'apps/web/.env.local'),
    resolve(ROOT, '.env'),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in .env.local or apps/api/.env.local`);
  }
  return value;
}

const LEAD_SEEDS: Database['public']['Tables']['leads']['Insert'][] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'Maria Gonzalez',
    phone: '+15125550101',
    email: 'maria.gonzalez@example.com',
    budget_min: 450000,
    budget_max: 550000,
    timeline: '3-6 months',
    financing_status: 'pre-approved',
    area_of_interest: 'South Austin, 78704',
    beds: 3,
    baths: 2,
    status: 'new',
    notes: 'Relocating from Dallas; prefers walkable neighborhoods.',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'James Whitfield',
    phone: '+15125550102',
    email: 'j.whitfield@example.com',
    budget_min: 650000,
    budget_max: 800000,
    timeline: '60 days',
    financing_status: 'cash',
    area_of_interest: 'West Lake Hills',
    beds: 4,
    baths: 3,
    status: 'contacted',
    notes: 'Follow up after weekend open house.',
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'Priya Sharma',
    phone: '+15125550103',
    email: 'priya.sharma@example.com',
    budget_min: 350000,
    budget_max: 425000,
    timeline: 'ASAP',
    financing_status: 'pre-approved',
    area_of_interest: 'Round Rock, 78664',
    beds: 3,
    baths: 2,
    status: 'qualified',
    notes: 'Wants good schools; flexible on HOA.',
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'Carlos Mendez',
    phone: '+15125550104',
    email: 'carlos.m@example.com',
    budget_min: 275000,
    budget_max: 340000,
    timeline: '6+ months',
    financing_status: 'exploring',
    area_of_interest: 'Pflugerville',
    beds: 2,
    baths: 2,
    status: 'nurturing',
  },
  {
    id: '22222222-2222-4222-8222-222222222205',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'Emily Nguyen',
    phone: '+15125550105',
    email: 'emily.nguyen@example.com',
    budget_min: 500000,
    budget_max: 620000,
    timeline: '30 days',
    financing_status: 'pre-approved',
    area_of_interest: 'Cedar Park, 78613',
    beds: 4,
    baths: 2.5,
    status: 'converted',
    notes: 'Under contract on 1420 Cypress Bend Dr.',
  },
  {
    id: '22222222-2222-4222-8222-222222222206',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'Robert Chen',
    phone: '+15125550106',
    email: 'r.chen@example.com',
    budget_min: 900000,
    budget_max: 1200000,
    timeline: 'paused',
    financing_status: 'pre-approved',
    area_of_interest: 'Downtown Austin, 78701',
    beds: 2,
    baths: 2,
    status: 'lost',
    notes: 'Chose another agent.',
  },
  {
    id: '22222222-2222-4222-8222-222222222207',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: "Sarah O'Connor",
    phone: '+15125550107',
    email: 'sarah.oconnor@example.com',
    budget_min: 400000,
    budget_max: 480000,
    timeline: '90 days',
    financing_status: 'pre-approved',
    area_of_interest: 'Hyde Park, 78751',
    beds: 3,
    baths: 2,
    status: 'new',
  },
  {
    id: '22222222-2222-4222-8222-222222222208',
    tenant_id: DEV.tenantId,
    agent_id: DEV.agentId,
    name: 'David Brooks',
    phone: '+15125550108',
    email: 'david.brooks@example.com',
    budget_min: 550000,
    budget_max: 700000,
    timeline: '4 months',
    financing_status: 'pre-approved',
    area_of_interest: 'Georgetown, 78626',
    beds: 4,
    baths: 3,
    status: 'contacted',
  },
];

const LISTING_SEEDS: Database['public']['Tables']['listings']['Insert'][] = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1001',
    originating_system_name: 'unlock',
    address: '2104 Barton Springs Rd, Austin, TX 78704',
    price: 589000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1840,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1002',
    originating_system_name: 'unlock',
    address: '4512 Duval St, Austin, TX 78751',
    price: 725000,
    bedrooms: 4,
    bathrooms: 2.5,
    sqft: 2210,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333303',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1003',
    originating_system_name: 'unlock',
    address: '8801 Research Blvd, Austin, TX 78758',
    price: 415000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1180,
    status: 'pending',
  },
  {
    id: '33333333-3333-4333-8333-333333333304',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1004',
    originating_system_name: 'unlock',
    address: '1420 Cypress Bend Dr, Cedar Park, TX 78613',
    price: 498000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2450,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333305',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1005',
    originating_system_name: 'unlock',
    address: '3301 Esperanza Crossing, Austin, TX 78758',
    price: 365000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1050,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333306',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1006',
    originating_system_name: 'unlock',
    address: '1200 Barton Creek Blvd, Austin, TX 78735',
    price: 1150000,
    bedrooms: 5,
    bathrooms: 4.5,
    sqft: 4100,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333307',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1007',
    originating_system_name: 'unlock',
    address: '901 E 6th St Unit 405, Austin, TX 78702',
    price: 445000,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 780,
    status: 'sold',
  },
  {
    id: '33333333-3333-4333-8333-333333333308',
    tenant_id: DEV.tenantId,
    integration_id: DEV.integrationId,
    mls_id: 'ABOR-ACT-1008',
    originating_system_name: 'unlock',
    address: '1808 E 12th St, Austin, TX 78702',
    price: 520000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1560,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333309',
    tenant_id: DEV.tenantId,
    integration_id: DEV.ctxIntegrationId,
    mls_id: 'CTX-76501-2001',
    originating_system_name: 'ctxmls',
    address: '412 S Main St, Temple, TX 76501',
    price: 289000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1620,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333310',
    tenant_id: DEV.tenantId,
    integration_id: DEV.ctxIntegrationId,
    mls_id: 'CTX-76541-2002',
    originating_system_name: 'ctxmls',
    address: '901 Trimmier Rd, Killeen, TX 76541',
    price: 315000,
    bedrooms: 4,
    bathrooms: 2,
    sqft: 1980,
    status: 'active',
  },
  {
    id: '33333333-3333-4333-8333-333333333311',
    tenant_id: DEV.tenantId,
    integration_id: DEV.ctxIntegrationId,
    mls_id: 'CTX-76513-2003',
    originating_system_name: 'ctxmls',
    address: '220 E Central Ave, Belton, TX 76513',
    price: 245000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1450,
    status: 'pending',
  },
];

async function main(): Promise<void> {
  loadEnvFiles();

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const tenantOverride = process.env.SEED_TENANT_ID ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;

  const db = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tenantId = tenantOverride || DEV.tenantId;
  const useDevTenant = tenantId === DEV.tenantId;

  if (useDevTenant) {
    const { error: tenantError } = await db.from('tenants').upsert(
      {
        id: DEV.tenantId,
        name: 'Voxori Dev (Austin)',
        subdomain: 'dev-austin',
        plan: 'professional',
      },
      { onConflict: 'id' }
    );
    if (tenantError) throw new Error(`tenant upsert: ${tenantError.message}`);

    const { error: agentError } = await db.from('agents').upsert(
      {
        id: DEV.agentId,
        tenant_id: DEV.tenantId,
        name: 'Austin Inside Sales Agent',
        is_active: true,
        llm_model: 'gpt-4o',
        system_prompt: 'You are a friendly Austin real estate inside sales agent.',
      },
      { onConflict: 'id' }
    );
    if (agentError) throw new Error(`agent upsert: ${agentError.message}`);

    const { error: integrationError } = await db.from('integrations').upsert(
      [
        {
          id: DEV.integrationId,
          tenant_id: DEV.tenantId,
          type: 'mls_idx',
          market_id: MLS_MARKET_IDS.IDX_BROKER_PRIMARY,
          is_active: true,
          credentials: process.env.IDX_BROKER_API_KEY
            ? encryptCredentials({ api_key: process.env.IDX_BROKER_API_KEY })
            : encryptCredentials({ mode: 'seed_placeholder' }),
          config: {
            provider: 'idx_broker',
            market_id: MLS_MARKET_IDS.IDX_BROKER_PRIMARY,
            originating_system_name: 'idx_broker',
            displayName: DEFAULT_LAUNCH_MLS_MARKET.displayName,
          },
        },
        {
          id: DEV.ctxIntegrationId,
          tenant_id: DEV.tenantId,
          type: 'mls_idx',
          market_id: MLS_MARKET_IDS.CENTRAL_TEXAS_CTX,
          is_active: true,
          config: {
            provider: 'trestle',
            market_id: MLS_MARKET_IDS.CENTRAL_TEXAS_CTX,
            originating_system_name: 'ctxmls',
            displayName: 'Central Texas (CTXMLS)',
          },
        },
      ],
      { onConflict: 'id' }
    );
    if (integrationError) throw new Error(`integration upsert: ${integrationError.message}`);
  } else {
    const { data: tenant, error: tenantLookupError } = await db
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle();
    if (tenantLookupError) throw new Error(`tenant lookup: ${tenantLookupError.message}`);
    if (!tenant) {
      throw new Error(
        `Tenant ${tenantId} not found. Sign up locally or set SEED_TENANT_ID to an existing tenant.`
      );
    }

    const { data: integration } = await db
      .from('integrations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', 'mls_idx')
      .maybeSingle();

    if (!integration) {
      throw new Error(
        `No mls_idx integration for tenant ${tenantId}. Run seed without SEED_TENANT_ID to create the dev tenant, or add an integration first.`
      );
    }
  }

  const effectiveAgentId = useDevTenant ? DEV.agentId : null;
  const effectiveIntegrationId = useDevTenant
    ? DEV.integrationId
    : (
        await db
          .from('integrations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('type', 'mls_idx')
          .single()
      ).data?.id;

  if (!effectiveIntegrationId) {
    throw new Error('Could not resolve integration_id for listings seed.');
  }

  const leads = LEAD_SEEDS.map((lead) => ({
    ...lead,
    tenant_id: tenantId,
    agent_id: effectiveAgentId ?? lead.agent_id,
  }));

  const { error: leadsError } = await db.from('leads').upsert(leads, { onConflict: 'id' });
  if (leadsError) {
    if (leadsError.code === '42P01') {
      throw new Error('leads table missing — run pnpm db:migrate or pnpm db:reset first.');
    }
    throw new Error(`leads upsert: ${leadsError.message}`);
  }

  const listings = LISTING_SEEDS.map((listing) => ({
    ...listing,
    tenant_id: tenantId,
    integration_id:
      listing.originating_system_name === 'ctxmls'
        ? useDevTenant
          ? DEV.ctxIntegrationId
          : effectiveIntegrationId
        : effectiveIntegrationId,
  }));

  const { error: listingsError } = await db.from('listings').upsert(listings, {
    onConflict: 'id',
  });
  if (listingsError) {
    if (listingsError.code === '42P01') {
      throw new Error('listings table missing — run pnpm db:migrate or pnpm db:reset first.');
    }
    throw new Error(`listings upsert: ${listingsError.message}`);
  }

  if (useDevTenant) {
    const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const endedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString();

    await db.from('calls').upsert(
      {
        id: DEV.callId,
        tenant_id: DEV.tenantId,
        agent_id: DEV.agentId,
        vapi_call_id: 'vapi-seed-call-001',
        caller_number: '+15125550101',
        consent_given: true,
        duration_seconds: 420,
        status: 'completed',
        outcome: 'scheduled',
        summary: 'Caller booked a showing in South Austin.',
        started_at: startedAt,
        ended_at: endedAt,
      },
      { onConflict: 'id' }
    );

    const toolEvents: Database['public']['Tables']['call_tool_events']['Insert'][] = [
      {
        id: '55555555-5555-4555-8555-555555555501',
        call_id: DEV.callId,
        tool_name: 'search_listings',
        idempotency_key: 'seed-search-listings',
        status: 'success',
        input: { max_price: 550000, min_bedrooms: 3 },
        output: { listings: [{ address: '2104 Barton Springs Rd' }], source: 'seed' },
        duration_ms: 820,
      },
      {
        id: '55555555-5555-4555-8555-555555555502',
        call_id: DEV.callId,
        tool_name: 'book_showing',
        idempotency_key: 'seed-book-showing',
        status: 'success',
        input: { date: '2026-06-01', time: '14:00', listing_address: '2104 Barton Springs Rd' },
        output: { success: true },
        duration_ms: 1200,
      },
      {
        id: '55555555-5555-4555-8555-555555555503',
        call_id: DEV.callId,
        tool_name: 'log_lead',
        idempotency_key: 'seed-log-lead',
        status: 'success',
        input: { caller_name: 'Maria Gonzalez', caller_phone: '+15125550101' },
        output: { logged: true, lead_id: LEAD_SEEDS[0]!.id },
        duration_ms: 640,
      },
    ];

    await db.from('call_tool_events').upsert(toolEvents, { onConflict: 'id' });
  }

  console.log('Dev seed complete.');
  console.log(`  Tenant:   ${tenantId}`);
  console.log(`  Leads:    ${leads.length} (Austin / Central Texas)`);
  console.log(`  Listings: ${listings.length} (Unlock + CTXMLS sample data)`);
  if (useDevTenant) {
    console.log('');
    console.log('Tip: set NEXT_PUBLIC_DEFAULT_TENANT_ID in apps/admin/.env.local to:');
    console.log(`  ${DEV.tenantId}`);
    console.log('');
    console.log(
      'For dashboard data, sign in with a user linked to this tenant, or use the dev tenant after bootstrap.'
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
