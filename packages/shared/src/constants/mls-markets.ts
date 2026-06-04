/**
 * MLS market configuration. IDX Broker is the primary partner feed; Bridge/Trestle remain
 * optional regional fallbacks when tenants configure legacy RESO credentials.
 */

export const MLS_MARKET_IDS = {
  IDX_BROKER_PRIMARY: 'idx_broker_primary',
  AUSTIN_CENTRAL_TEXAS: 'austin_central_texas',
  CENTRAL_TEXAS_CTX: 'central_texas_ctx',
} as const;

export type MlsMarketId = (typeof MLS_MARKET_IDS)[keyof typeof MLS_MARKET_IDS];

export type MlsProvider = 'idx_broker' | 'bridge' | 'trestle';

export interface MlsMarketConfig {
  id: MlsMarketId;
  displayName: string;
  provider: MlsProvider;
  /** RESO / cache originating system — used for listing dedupe and cache keys */
  originatingSystemName: string;
  /** IDX Broker internal MLS id filter (optional; omit to search all MLSs on the account) */
  idxMlsId?: string;
  /** Bridge Interactive dataset segment (e.g. abor_ref for Unlock MLS / ABOR) */
  bridgeMarketId?: string;
  /** Trestle Matrix MLO identifier for CTXMLS */
  trestleMloId?: string;
  cities: readonly string[];
  /** Representative ZIP codes for default geo-scoped search */
  defaultZipCodes: readonly string[];
}

export const MLS_MARKETS: Record<MlsMarketId, MlsMarketConfig> = {
  [MLS_MARKET_IDS.IDX_BROKER_PRIMARY]: {
    id: MLS_MARKET_IDS.IDX_BROKER_PRIMARY,
    displayName: 'IDX Broker (Partner MLS)',
    provider: 'idx_broker',
    originatingSystemName: 'idx_broker',
    cities: [
      'Austin',
      'Round Rock',
      'Cedar Park',
      'Georgetown',
      'Pflugerville',
      'Leander',
      'Kyle',
      'Buda',
      'San Marcos',
      'Temple',
      'Killeen',
    ],
    defaultZipCodes: [
      '78701',
      '78702',
      '78703',
      '78704',
      '78705',
      '78731',
      '78751',
      '78756',
      '78660',
      '78613',
      '76501',
      '76541',
    ],
  },
  [MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS]: {
    id: MLS_MARKET_IDS.AUSTIN_CENTRAL_TEXAS,
    displayName: 'Austin / Central Texas (Unlock MLS — legacy Bridge)',
    provider: 'bridge',
    originatingSystemName: 'unlock',
    bridgeMarketId: 'abor_ref',
    cities: [
      'Austin',
      'Round Rock',
      'Cedar Park',
      'Georgetown',
      'Pflugerville',
      'Leander',
      'Kyle',
      'Buda',
      'San Marcos',
      'Bastrop',
    ],
    defaultZipCodes: [
      '78701',
      '78702',
      '78703',
      '78704',
      '78705',
      '78731',
      '78751',
      '78756',
      '78660',
      '78613',
    ],
  },
  [MLS_MARKET_IDS.CENTRAL_TEXAS_CTX]: {
    id: MLS_MARKET_IDS.CENTRAL_TEXAS_CTX,
    displayName: 'Central Texas (CTXMLS — legacy Trestle)',
    provider: 'trestle',
    originatingSystemName: 'ctxmls',
    trestleMloId: 'CTX',
    cities: [
      'Temple',
      'Killeen',
      'Belton',
      'Copperas Cove',
      'Harker Heights',
      'Salado',
      'Georgetown',
      'Round Rock',
    ],
    defaultZipCodes: [
      '76501',
      '76502',
      '76541',
      '76542',
      '76543',
      '76548',
      '76513',
      '78626',
    ],
  },
};

export const DEFAULT_LAUNCH_MLS_MARKET =
  MLS_MARKETS[MLS_MARKET_IDS.IDX_BROKER_PRIMARY];

export const ALL_MLS_MARKET_IDS = Object.values(MLS_MARKET_IDS);

export function resolveMlsMarket(marketId?: string | null): MlsMarketConfig {
  if (marketId && marketId in MLS_MARKETS) {
    return MLS_MARKETS[marketId as MlsMarketId];
  }
  return DEFAULT_LAUNCH_MLS_MARKET;
}

export function listMlsMarkets(): MlsMarketConfig[] {
  return Object.values(MLS_MARKETS);
}
