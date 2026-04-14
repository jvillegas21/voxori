export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-2 text-gray-500">
        Call outcome breakdown and conversion metrics.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Call Outcomes</h2>
          <p className="mt-4 text-center text-sm text-gray-400">
            Charts will populate once you have call data.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Volume by Day</h2>
          <p className="mt-4 text-center text-sm text-gray-400">
            Charts will populate once you have call data.
          </p>
        </div>
      </div>
    </div>
  );
}
