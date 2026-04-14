export default function IntegrationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-2 text-gray-500">Manage your connected services.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { name: 'Google Calendar', status: 'Connect', category: 'Calendar' },
          { name: 'Calendly', status: 'Connect', category: 'Calendar' },
          { name: 'Follow Up Boss', status: 'Connect', category: 'CRM' },
          { name: 'KW Command', status: 'Connect', category: 'CRM' },
          { name: 'Spark API / IDX', status: 'Phase 3', category: 'MLS' },
        ].map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="font-medium">{integration.name}</p>
              <p className="text-xs text-gray-400">{integration.category}</p>
            </div>
            <button
              className={`rounded px-3 py-1.5 text-sm ${
                integration.status === 'Phase 3'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
              disabled={integration.status === 'Phase 3'}
            >
              {integration.status}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
