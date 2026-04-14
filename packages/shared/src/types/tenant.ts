export type PlanTier = 'starter' | 'professional' | 'growth' | 'agency';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: PlanTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  branding: TenantBranding | null;
  createdAt: string;
}

export interface TenantBranding {
  brandName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  supportEmail?: string;
  hidePoweredBy?: boolean;
}
