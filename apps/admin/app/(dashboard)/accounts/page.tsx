export default function AccountsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <button className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          + New Account
        </button>
      </div>
      <p className="mt-2 text-gray-400">All tenant accounts on the platform.</p>
      <div className="mt-6 overflow-hidden rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              {['Name', 'Plan', 'Status', 'MRR', 'Calls (30d)', 'Created', ''].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-400"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                No accounts yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
