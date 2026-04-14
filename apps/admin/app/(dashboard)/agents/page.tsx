import { createServiceRoleClient } from '@voxori/database';
import Link from 'next/link';
import { AgentTemplateWizard } from './agent-template-wizard';

export default async function AdminAgentsPage() {
  const db = createServiceRoleClient();

  const { data: agents } = await db
    .from('agents')
    .select('id, name, is_active, config, created_at, tenants(name, subdomain)')
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = agents ?? [];

  return (
    <div className="space-y-10">
      {/* ── All Agents ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">All Agents ({rows.length})</h2>

        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Agent Name', 'Tenant Name', 'Active', 'Vapi Sync', 'Template', 'Created'].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No agents yet.
                  </td>
                </tr>
              ) : (
                rows.map((agent) => {
                  const tenant = Array.isArray(agent.tenants)
                    ? agent.tenants[0]
                    : agent.tenants;
                  const config = (agent.config ?? {}) as Record<string, unknown>;
                  const vapiSynced = Boolean(config['vapi_assistant_id']);
                  const templateId = typeof config['template_id'] === 'string'
                    ? config['template_id']
                    : null;
                  const createdAt = agent.created_at
                    ? new Date(agent.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={agent.id} className="bg-gray-950 hover:bg-gray-900/60">
                      {/* Agent Name */}
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/agents/${agent.id}`}
                          className="hover:underline hover:text-blue-400"
                        >
                          {agent.name}
                        </Link>
                      </td>

                      {/* Tenant Name */}
                      <td className="px-4 py-3 text-gray-300">
                        {tenant?.name ?? (
                          <span className="text-gray-600">—</span>
                        )}
                        {tenant?.subdomain ? (
                          <span className="ml-1 text-xs text-gray-500">
                            ({tenant.subdomain})
                          </span>
                        ) : null}
                      </td>

                      {/* Active badge */}
                      <td className="px-4 py-3">
                        {agent.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400 ring-1 ring-gray-700">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Vapi Sync */}
                      <td className="px-4 py-3 text-sm">
                        {vapiSynced ? (
                          <span className="text-green-400">&#10003; synced</span>
                        ) : (
                          <span className="text-yellow-500">&#9888; not synced</span>
                        )}
                      </td>

                      {/* Template */}
                      <td className="px-4 py-3 text-gray-300">
                        {templateId ?? <span className="text-gray-600">—</span>}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-gray-400">{createdAt}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <hr className="border-gray-800" />

      {/* ── Create Agent from Template ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Create Agent from Template</h2>
        <AgentTemplateWizard />
      </section>
    </div>
  );
}
