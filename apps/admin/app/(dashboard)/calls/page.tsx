import { createServiceRoleClient } from '@voxori/database/client';

export default async function AdminCallsPage() {
  const db = createServiceRoleClient();
  const { data: calls } = await db
    .from('calls')
    .select('id, caller_number, duration_seconds, status, outcome, started_at, tenant_id, agent_id, tenants(name)')
    .order('started_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Calls</h1>
        <span className="text-sm text-gray-400">Last 50 calls across all tenants</span>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50 text-left text-gray-400">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Caller</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {!calls?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No calls yet.</td></tr>
            )}
            {calls?.map(call => {
              const dur = call.duration_seconds;
              const durStr = dur ? `${Math.floor(dur / 60)}m ${dur % 60}s` : '—';
              const tenantRaw = call.tenants;
              const tenantName = Array.isArray(tenantRaw) ? tenantRaw[0]?.name : (tenantRaw as { name: string } | null)?.name;
              return (
                <tr key={call.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(call.started_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{tenantName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{call.caller_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{durStr}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${
                      call.status === 'completed' ? 'bg-green-900 text-green-300' :
                      call.status === 'missed'    ? 'bg-yellow-900 text-yellow-300' :
                                                    'bg-red-900 text-red-300'
                    }`}>{call.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{call.outcome ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
