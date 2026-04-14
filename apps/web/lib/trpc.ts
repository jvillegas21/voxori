import { createTRPCReact } from '@trpc/react-query';
import type { AnyRouter } from '@trpc/server';

/** Replace with `import type { AppRouter } from '@voxori/api'` once the API router exists. */
export type AppRouter = AnyRouter;

export const trpc = createTRPCReact<AppRouter>();
