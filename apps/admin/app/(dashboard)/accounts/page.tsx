import { createServiceRoleClient } from '@voxori/database/client';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AccountsPage() {
  const db = createServiceRoleClient();
  const { data: tenants } = await db
    .from('tenants')
    .select('id, name, subdomain, plan, stripe_customer_id, created_at')
    .order('created_at', { ascending: false });

  const planColors: Record<string, string> = {
    starter:      'bg-gray-700 text-gray-200',
    professional: 'bg-blue-800 text-blue-200',
    growth:       'bg-purple-800 text-purple-200',
    agency:       'bg-amber-800 text-amber-200',
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Accounts</h1>
        <span className="text-sm text-gray-400">{tenants?.length ?? 0} tenants</span>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Subdomain</TableHead>
              <TableHead className="text-gray-400">Plan</TableHead>
              <TableHead className="text-gray-400">Stripe</TableHead>
              <TableHead className="text-gray-400">Created</TableHead>
              <TableHead className="text-gray-400"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!tenants?.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No accounts yet.
                </TableCell>
              </TableRow>
            )}
            {tenants?.map(tenant => (
              <TableRow key={tenant.id} className="border-gray-800 hover:bg-gray-800/50">
                <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                <TableCell className="text-gray-400 font-mono text-xs">{tenant.subdomain}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${planColors[tenant.plan] ?? 'bg-gray-700 text-gray-200'}`}>
                    {tenant.plan}
                  </span>
                </TableCell>
                <TableCell className="text-gray-400 text-xs">
                  {tenant.stripe_customer_id ? (
                    <span className="text-green-400">✓ connected</span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-400 text-xs">
                  {new Date(tenant.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Link href={`/accounts/${tenant.id}`} className="text-xs text-blue-400 hover:text-blue-300">
                    View →
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
