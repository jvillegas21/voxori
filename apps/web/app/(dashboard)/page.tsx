export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-500">
        Welcome to your Voxori portal. Your call activity will appear here.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {['Total Calls', 'Showings Booked', 'Missed Calls', 'Avg Duration'].map((metric) => (
          <div key={metric} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">{metric}</p>
            <p className="mt-1 text-2xl font-bold">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
