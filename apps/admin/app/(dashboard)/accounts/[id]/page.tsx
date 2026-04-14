import { createServiceRoleClient } from '@voxori/database/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  const db = createServiceRoleClient();

  const [tenantResult, usersResult, agentsResult] = await Promise.all([
    db.from('tenants').select('*').eq('id', params.id).single(),
    db.from('users').select('id, email, full_name, role, created_at').eq('tenant_id', params.id).order('created_at'),
    db.from('agents').select('id, name, is_active, config, created_at').eq('tenant_id', params.id).order('created_at'),
  ]);

  if (!tenantResult.data) notFound();
  const tenant = tenantResult.data;
  const users = usersResult.data ?? [];
  const agents = agentsResult.data ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/accounts" className="text-sm text-gray-400 hover:text-white">← Accounts</Link>
        <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{tenant.plan}</span>
      </div>

      {/* Tenant Info */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Account Details</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['ID', tenant.id],
            ['Subdomain', tenant.subdomain],
            ['Plan', tenant.plan],
            ['Stripe Customer', tenant.stripe_customer_id ?? '—'],
            ['Stripe Subscription', tenant.stripe_subscription_id ?? '—'],
            ['Created', new Date(tenant.created_at).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="mt-0.5 font-mono text-xs text-gray-200 break-all">{value as string}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Users */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Users ({users.length})</h2>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No users.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-2">Email</th><th className="pb-2">Name</th><th className="pb-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 text-gray-300">
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.full_name ?? '—'}</td>
                  <td className="py-2"><span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs">{u.role}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Agents */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Agents ({agents.length})</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-gray-500">No agents.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-2">Name</th><th className="pb-2">Active</th><th className="pb-2">Vapi ID</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(a => {
                const config = a.config as Record<string, unknown> | null;
                return (
                  <tr key={a.id} className="border-b border-gray-800/50 text-gray-300">
                    <td className="py-2">{a.name}</td>
                    <td className="py-2">{a.is_active ? <span className="text-green-400">Active</span> : <span className="text-gray-500">Inactive</span>}</td>
                    <td className="py-2 font-mono text-xs text-gray-400">{(config?.vapi_assistant_id as string | undefined) ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
