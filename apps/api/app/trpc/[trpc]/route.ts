import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter }    from '../../../lib/trpc/root';
import { createContext } from '../../../lib/trpc/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[tRPC error] ${path}:`, error);
      }
    },
  });

export { handler as GET, handler as POST };
