import { router } from './init';
import { authRouter } from './routers/auth.router';
import { agentsRouter } from './routers/agents.router';
import { callsRouter } from './routers/calls.router';
import { billingRouter } from './routers/billing.router';
import { leadsRouter } from './routers/leads.router';
import { showingsRouter } from './routers/showings.router';
import { onboardingRouter } from './routers/onboarding.router';
import { integrationsRouter } from './routers/integrations.router';
import { analyticsRouter } from './routers/analytics.router';
import { phoneNumbersRouter } from './routers/phone-numbers.router';
import { listingsRouter } from './routers/listings.router';
import { teamRouter } from './routers/team.router';

export const appRouter = router({
  auth: authRouter,
  agents: agentsRouter,
  calls: callsRouter,
  billing: billingRouter,
  leads: leadsRouter,
  showings: showingsRouter,
  onboarding: onboardingRouter,
  integrations: integrationsRouter,
  analytics: analyticsRouter,
  phoneNumbers: phoneNumbersRouter,
  listings: listingsRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
