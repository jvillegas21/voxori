export default function AdminAgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Agents</h1>
      <p className="mt-2 text-gray-400">All agents across all tenants.</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              {['Agent Name', 'Tenant', 'LLM', 'Voice ID', 'Status', 'Created'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                No agents yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
