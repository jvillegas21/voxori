import { createServiceRoleClient } from '@voxori/database/client';

const PLAN_MRR: Record<string, number> = {
  starter: 149, professional: 299, growth: 499, agency: 999,
};

export default async function BillingPage() {
  const db = createServiceRoleClient();
  const [{ data: tenants }, { data: recentEvents }] = await Promise.all([
    db.from('tenants').select('id, name, plan, stripe_customer_id, stripe_subscription_id'),
    db.from('audit_log')
      .select('id, action, tenant_id, metadata, created_at')
      .like('action', 'stripe.%')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const planCounts = (tenants ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  const mrr = Object.entries(planCounts).reduce(
    (sum, [plan, count]) => sum + (PLAN_MRR[plan] ?? 0) * count,
    0
  );

  const stripeConnected = (tenants ?? []).filter(t => t.stripe_customer_id).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Billing Overview</h1>

      {/* MRR cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Estimated MRR', value: `$${mrr.toLocaleString()}` },
          { label: 'Total Accounts', value: (tenants ?? []).length },
          { label: 'Stripe Connected', value: stripeConnected },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Plan Breakdown</h2>
        <div className="space-y-2">
          {Object.entries(PLAN_MRR).map(([plan, price]) => {
            const count = planCounts[plan] ?? 0;
            return (
              <div key={plan} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-300">{plan} (${price}/mo)</span>
                <span className="text-white font-medium">{count} accounts — ${(price * count).toLocaleString()}/mo</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Stripe events */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Recent Stripe Events</h2>
        {!recentEvents?.length ? (
          <p className="text-sm text-gray-500">No Stripe events yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="pb-2">Event</th><th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map(e => (
                <tr key={e.id} className="border-b border-gray-800/50">
                  <td className="py-2 font-mono text-xs text-gray-300">{e.action}</td>
                  <td className="py-2 text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
