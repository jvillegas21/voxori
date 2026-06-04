import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import type { Json } from '@voxori/database/types';
import {
  DEFAULT_LAUNCH_MLS_MARKET,
  MLS_MARKET_IDS,
  resolveMlsMarket,
  type MlsMarketId,
} from '@voxori/shared/constants';
import { router, tenantProcedure } from '../init';
import { createServiceRoleClient } from '@voxori/database/client';
import {
  assertCredentialsEncryptionConfigured,
  assertIntegrationConfigHasNoSecrets,
  CredentialsEncryptionError,
  encryptCredentials,
} from '../../services/credentials';
import { validateFubApiKey } from '../../services/fub.service';
import { buildGoogleOAuthUrl } from '../../services/google-calendar.service';
import { idxBrokerCredentialsAvailable } from '../../services/mls/idx-broker.provider';
import { syncIntegrationListings } from '../../services/mls';
import { markStepComplete } from '../../services/onboarding.service';

const integrationTypes = ['mls', 'crm', 'calendar'] as const;
type IntegrationApiType = (typeof integrationTypes)[number];

const INTEGRATION_API_TO_DB = {
  mls: 'mls_idx',
  crm: 'crm',
  calendar: 'google_calendar',
} as const satisfies Record<IntegrationApiType, 'mls_idx' | 'crm' | 'google_calendar'>;

const mlsMarketIdSchema = z.enum([
  MLS_MARKET_IDS.IDX_BROKER_PRIMARY,
  MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS,
  MLS_MARKET_IDS.CENTRAL_TEXAS_CTX,
]);

type ConnectResult =
  | { type: IntegrationApiType; connected: false; status: 'oauth_required'; oauthUrl: string }
  | {
      type: IntegrationApiType;
      connected: true;
      status: 'connected';
      lastSyncedAt: string | null;
      marketId?: string;
    };

const INTEGRATION_LABELS: Record<(typeof integrationTypes)[number], string> = {
  mls: 'MLS Feed',
  crm: 'CRM',
  calendar: 'Calendar',
};

const INTEGRATION_DESCRIPTIONS: Record<(typeof integrationTypes)[number], string> = {
  mls: 'IDX Broker (primary) with optional Bridge / Trestle legacy feeds',
  crm: 'Follow Up Boss, KvCORE, HubSpot, and more',
  calendar: 'Google Calendar or Outlook for showing bookings',
};

const ONBOARDING_STEP_BY_TYPE: Record<IntegrationApiType, 'mls' | 'crm' | 'calendar'> = {
  mls: 'mls',
  crm: 'crm',
  calendar: 'calendar',
};

function resolveMlsConnectConfig(marketId: MlsMarketId) {
  const market = resolveMlsMarket(marketId);
  return {
    provider: market.provider,
    market_id: market.id,
    originating_system_name: market.originatingSystemName,
    displayName: market.displayName,
  };
}

type NonMlsDbType = Exclude<
  (typeof INTEGRATION_API_TO_DB)[IntegrationApiType],
  'mls_idx'
>;

async function findExistingTenantIntegration(
  db: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  dbType: NonMlsDbType
): Promise<{ id: string } | null> {
  const { data, error } = await db
    .from('integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', dbType)
    .order('is_active', { ascending: false })
    .order('last_synced_at', { ascending: false, nullsFirst: false })
    .limit(1);

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  return data?.[0] ?? null;
}

async function findExistingMlsIntegration(
  db: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  marketId: MlsMarketId
): Promise<{ id: string } | null> {
  const { data: byMarket, error: byMarketError } = await db
    .from('integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'mls_idx')
    .eq('market_id', marketId)
    .maybeSingle();

  if (byMarketError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: byMarketError.message,
    });
  }

  if (byMarket) return byMarket;

  const { data: legacyRow, error: legacyError } = await db
    .from('integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('type', 'mls_idx')
    .is('market_id', null)
    .maybeSingle();

  if (legacyError) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: legacyError.message,
    });
  }

  return legacyRow;
}

export const integrationsRouter = router({
  listMlsMarkets: tenantProcedure.query(() => {
    return Object.values(MLS_MARKET_IDS).map((id) => {
      const market = resolveMlsMarket(id);
      return {
        id: market.id,
        displayName: market.displayName,
        provider: market.provider,
        originatingSystemName: market.originatingSystemName,
      };
    });
  }),

  list: tenantProcedure.query(async ({ ctx }) => {
    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('integrations')
      .select('id, type, is_active, last_synced_at, config, market_id')
      .eq('tenant_id', ctx.tenantId);

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    const rows = data ?? [];
    const mlsRows = rows.filter((row) => row.type === 'mls_idx' && row.is_active);

    return integrationTypes.map((type) => {
      const dbType = INTEGRATION_API_TO_DB[type];
      const row = rows.find((r) => r.type === dbType && r.is_active);

      if (type === 'mls') {
        const feeds = mlsRows.map((mlsRow) => {
          const marketId =
            mlsRow.market_id ??
            (mlsRow.config as Record<string, unknown> | null)?.market_id?.toString() ??
            DEFAULT_LAUNCH_MLS_MARKET.id;
          const market = resolveMlsMarket(marketId);
          return {
            integrationId: mlsRow.id,
            marketId: market.id,
            displayName: market.displayName,
            provider: market.provider,
            originatingSystemName: market.originatingSystemName,
            lastSyncedAt: mlsRow.last_synced_at,
          };
        });

        return {
          type,
          connected: feeds.length > 0,
          label: INTEGRATION_LABELS[type],
          description: INTEGRATION_DESCRIPTIONS[type],
          lastSyncedAt: feeds[0]?.lastSyncedAt ?? null,
          provider: feeds.length === 1 ? feeds[0]!.provider : feeds.length > 1 ? 'multi' : null,
          feeds,
        };
      }

      return {
        type,
        connected: Boolean(row?.is_active),
        label: INTEGRATION_LABELS[type],
        description: INTEGRATION_DESCRIPTIONS[type],
        lastSyncedAt: row?.last_synced_at ?? null,
        provider: (row?.config as Record<string, unknown> | null)?.provider ?? null,
        feeds: [],
      };
    });
  }),

  getCalendarOAuthUrl: tenantProcedure.query(({ ctx }) => {
    const oauthUrl = buildGoogleOAuthUrl(ctx.tenantId);
    if (!oauthUrl) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Google Calendar OAuth is not configured (GOOGLE_CLIENT_ID missing)',
      });
    }
    return { oauthUrl };
  }),

  connect: tenantProcedure
    .input(
      z.object({
        type: z.enum(integrationTypes),
        credentials: z.record(z.string()).optional(),
        marketId: mlsMarketIdSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<ConnectResult> => {
      try {
        assertCredentialsEncryptionConfigured();
      } catch (err) {
        if (err instanceof CredentialsEncryptionError) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: err.message,
          });
        }
        throw err;
      }

      const db = createServiceRoleClient();
      const dbType = INTEGRATION_API_TO_DB[input.type];
      const marketId = (input.marketId ?? DEFAULT_LAUNCH_MLS_MARKET.id) as MlsMarketId;

      if (input.type === 'mls') {
        const market = resolveMlsMarket(marketId);
        if (market.provider === 'idx_broker') {
          const apiKey = input.credentials?.api_key?.trim();
          if (!apiKey && !idxBrokerCredentialsAvailable()) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message:
                'IDX Broker API key is required. Generate one in IDX Control Panel → Access Control, or configure IDX_BROKER_API_KEY on the API.',
            });
          }
        }
      }

      if (input.type === 'crm') {
        const apiKey = input.credentials?.api_key?.trim();
        if (!apiKey) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Follow Up Boss API key is required. Generate one in FUB Admin → API.',
          });
        }

        const validation = await validateFubApiKey(apiKey);
        if (!validation.valid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.message,
          });
        }
      }

      if (input.type === 'calendar' && !input.credentials) {
        const oauthUrl = buildGoogleOAuthUrl(ctx.tenantId);
        if (!oauthUrl) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Google Calendar OAuth is not configured',
          });
        }
        return { type: input.type, connected: false, status: 'oauth_required' as const, oauthUrl };
      }

      const marketForConnect = resolveMlsMarket(marketId);

      const provider =
        input.type === 'crm'
          ? 'follow_up_boss'
          : input.type === 'calendar'
            ? 'google'
            : marketForConnect.provider;

      const config: Json =
        input.type === 'mls'
          ? resolveMlsConnectConfig(marketId)
          : { provider };

      try {
        assertIntegrationConfigHasNoSecrets(config as Record<string, unknown>);
      } catch (err) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: err instanceof Error ? err.message : 'Invalid integration config',
        });
      }

      const idxApiKey =
        input.type === 'mls' && marketForConnect.provider === 'idx_broker'
          ? input.credentials?.api_key?.trim()
          : undefined;

      const credentials =
        input.type === 'mls' && marketForConnect.provider === 'idx_broker'
          ? idxApiKey
            ? encryptCredentials({
                api_key: idxApiKey,
                ...(input.credentials?.account_id?.trim()
                  ? { account_id: input.credentials.account_id.trim() }
                  : {}),
                ...(input.credentials?.client_id?.trim()
                  ? { client_id: input.credentials.client_id.trim() }
                  : {}),
              })
            : encryptCredentials({ mode: 'platform' })
          : input.type === 'crm' && input.credentials
            ? encryptCredentials({ api_key: input.credentials.api_key.trim() })
            : input.credentials
              ? encryptCredentials(input.credentials)
              : encryptCredentials({ mode: 'platform' });

      const now = new Date().toISOString();
      const baseRow = {
        tenant_id: ctx.tenantId,
        type: dbType,
        credentials,
        config,
        is_active: true,
        last_synced_at: now,
        market_id: input.type === 'mls' ? marketId : null,
      };

      let integrationId: string;
      let lastSyncedAt: string | null = now;

      if (input.type === 'mls') {
        const existing = await findExistingMlsIntegration(db, ctx.tenantId, marketId);

        if (existing) {
          const { data, error } = await db
            .from('integrations')
            .update(baseRow)
            .eq('id', existing.id)
            .select('id, last_synced_at')
            .single();
          if (error || !data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error?.message ?? 'Failed to update MLS integration',
            });
          }
          integrationId = data.id;
          lastSyncedAt = data.last_synced_at;
        } else {
          const { data, error } = await db
            .from('integrations')
            .insert(baseRow)
            .select('id, last_synced_at')
            .single();
          if (error || !data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error?.message ?? 'Failed to connect MLS integration',
            });
          }
          integrationId = data.id;
          lastSyncedAt = data.last_synced_at;
        }
      } else {
        const existing = await findExistingTenantIntegration(
          db,
          ctx.tenantId,
          dbType as NonMlsDbType
        );

        if (existing) {
          const { data, error } = await db
            .from('integrations')
            .update(baseRow)
            .eq('id', existing.id)
            .select('id, last_synced_at')
            .single();
          if (error || !data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error?.message ?? 'Failed to update integration',
            });
          }
          integrationId = data.id;
          lastSyncedAt = data.last_synced_at;
        } else {
          const { data, error } = await db
            .from('integrations')
            .insert(baseRow)
            .select('id, last_synced_at')
            .single();

          if (error?.code === '23505') {
            const retryExisting = await findExistingTenantIntegration(
              db,
              ctx.tenantId,
              dbType as NonMlsDbType
            );
            if (retryExisting) {
              const { data: updated, error: updateError } = await db
                .from('integrations')
                .update(baseRow)
                .eq('id', retryExisting.id)
                .select('id, last_synced_at')
                .single();
              if (updateError || !updated) {
                throw new TRPCError({
                  code: 'INTERNAL_SERVER_ERROR',
                  message: updateError?.message ?? 'Failed to update integration',
                });
              }
              integrationId = updated.id;
              lastSyncedAt = updated.last_synced_at;
            } else {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message,
              });
            }
          } else if (error || !data) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: error?.message ?? 'Failed to connect integration',
            });
          } else {
            integrationId = data.id;
            lastSyncedAt = data.last_synced_at;
          }
        }
      }

      await markStepComplete(db, ctx.tenantId, ONBOARDING_STEP_BY_TYPE[input.type]);

      if (input.type === 'mls') {
        void syncIntegrationListings(db, {
          id: integrationId,
          tenant_id: ctx.tenantId,
          credentials,
          config: config as Record<string, unknown>,
          market_id: marketId,
        });
      }

      return {
        type: input.type,
        connected: true,
        status: 'connected' as const,
        lastSyncedAt,
        marketId: input.type === 'mls' ? marketId : undefined,
      };
    }),

  disconnect: tenantProcedure
    .input(
      z.object({
        type: z.enum(integrationTypes),
        marketId: mlsMarketIdSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = createServiceRoleClient();
      const dbType = INTEGRATION_API_TO_DB[input.type];

      let query = db
        .from('integrations')
        .update({ is_active: false, credentials: null })
        .eq('tenant_id', ctx.tenantId)
        .eq('type', dbType);

      if (input.type === 'mls' && input.marketId) {
        query = query.eq('market_id', input.marketId);
      }

      const { error } = await query;

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { type: input.type, connected: false, marketId: input.marketId };
    }),
});
