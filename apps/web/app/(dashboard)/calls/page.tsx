export default function CallsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Call Log</h1>
      <p className="mt-2 text-gray-500">View your call history, transcripts, and recordings.</p>
      <div className="mt-6 rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Recent Calls</h2>
        </div>
        <div className="p-6 text-center text-sm text-gray-400">
          No calls yet. Calls will appear here after your agent handles its first call.
        </div>
      </div>
    </div>
  );
}
