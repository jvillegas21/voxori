export default function ListingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Listings</h1>
      <p className="mt-2 text-gray-500">
        Connect your MLS / IDX provider so your agent can surface listing information during calls.
      </p>
      <div className="mt-6 rounded-lg border border-dashed bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">MLS integration available in Phase 3.</p>
        <p className="mt-1 text-xs text-gray-400">
          Supported providers: Spark API, iHomeFinder, IDX Broker
        </p>
      </div>
    </div>
  );
}
