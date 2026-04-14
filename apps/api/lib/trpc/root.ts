import { router } from './init';
import { authRouter }    from './routers/auth.router';
import { agentsRouter }  from './routers/agents.router';
import { callsRouter }   from './routers/calls.router';
import { billingRouter } from './routers/billing.router';

export const appRouter = router({
  auth:    authRouter,
  agents:  agentsRouter,
  calls:   callsRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
