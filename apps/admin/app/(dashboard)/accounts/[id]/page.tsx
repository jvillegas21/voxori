export default function AccountDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Account Detail</h1>
      <p className="mt-1 text-gray-400">Tenant ID: {params.id}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold">Account Info</h2>
          <p className="mt-2 text-sm text-gray-400">Name, plan, subdomain, Stripe data.</p>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold">Usage</h2>
          <p className="mt-2 text-sm text-gray-400">Minutes used this billing period.</p>
        </section>
      </div>
      <div className="mt-6 flex gap-3">
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Impersonate
        </button>
        <button className="rounded bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700">
          Suspend
        </button>
      </div>
    </div>
  );
}
