export interface UsageRecord {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  minutesUsed: number;
  minutesIncluded: number;
  overageMinutes: number;
  stripeUsageRecordId: string | null;
}

export interface PlanFeatures {
  name: string;
  pricePerMonth: number;
  includedMinutes: number;
  overageRatePerMinute: number;
  maxAgents: number | 'unlimited';
  voiceCloning: boolean;
  mlsIntegration: boolean;
  crmSync: boolean;
  callRecordingRetentionDays: number | 'unlimited';
  whiteLabel: false | 'subdomain' | 'full';
  mfa: boolean;
}
