import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@voxori/api';

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

export function makeTrpcClient(accessToken: string | null) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/trpc`,
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
        transformer: superjson,
      }),
    ],
  });
}
