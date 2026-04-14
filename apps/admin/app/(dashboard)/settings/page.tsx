import { createServiceRoleClient } from '@voxori/database/client';

export default async function AdminSettingsPage() {
  const db = createServiceRoleClient();
  const { data: templates } = await db
    .from('agent_templates')
    .select('id, name, vertical, version, is_active, created_at, updated_at')
    .order('vertical')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Global Settings</h1>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 font-semibold text-white">Agent Templates</h2>
        <p className="mb-4 text-sm text-gray-400">
          Templates are managed via the Agents page wizard. Use Supabase dashboard to edit locked prompt cores.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-400">
              <th className="pb-2">Name</th>
              <th className="pb-2">Vertical</th>
              <th className="pb-2">Version</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!templates?.length && (
              <tr><td colSpan={5} className="py-4 text-gray-500">No templates.</td></tr>
            )}
            {templates?.map(t => (
              <tr key={t.id} className="border-b border-gray-800/50">
                <td className="py-2 text-gray-200">{t.name}</td>
                <td className="py-2 text-gray-400">{t.vertical}</td>
                <td className="py-2 text-gray-400">v{t.version}</td>
                <td className="py-2">
                  {t.is_active
                    ? <span className="text-green-400 text-xs">Active</span>
                    : <span className="text-gray-500 text-xs">Inactive</span>
                  }
                </td>
                <td className="py-2 text-xs text-gray-500">{new Date(t.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
