export default function AdminCallsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Call Log</h1>
      <p className="mt-2 text-gray-400">Global call history across all tenants.</p>
      <div className="mt-6 rounded-lg border border-gray-800">
        <div className="border-b border-gray-800 px-6 py-4 text-sm text-gray-400">
          Filter by tenant, date range, outcome…
        </div>
        <div className="p-6 text-center text-sm text-gray-500">No calls yet.</div>
      </div>
    </div>
  );
}
