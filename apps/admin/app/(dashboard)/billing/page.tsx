export default function AdminBillingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-2 text-gray-400">Platform revenue, usage, and invoices.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['MRR', 'ARR', 'Active Accounts', 'Churn Rate'].map((metric) => (
          <div key={metric} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-400">{metric}</p>
            <p className="mt-1 text-2xl font-bold">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
