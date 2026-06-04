import type { Database } from '@voxori/database/types';

export type IntegrationApiType = 'mls' | 'crm' | 'calendar';
export type IntegrationDbType = Database['public']['Enums']['integration_type'];

export const INTEGRATION_API_TO_DB: Record<IntegrationApiType, IntegrationDbType> = {
  mls: 'mls_idx',
  crm: 'crm',
  calendar: 'google_calendar',
};

export const INTEGRATION_DB_TO_API: Partial<Record<IntegrationDbType, IntegrationApiType>> = {
  mls_idx: 'mls',
  crm: 'crm',
  google_calendar: 'calendar',
};

export function toDbIntegrationType(type: IntegrationApiType): IntegrationDbType {
  return INTEGRATION_API_TO_DB[type];
}

export function toApiIntegrationType(type: IntegrationDbType): IntegrationApiType | null {
  return INTEGRATION_DB_TO_API[type] ?? null;
}
