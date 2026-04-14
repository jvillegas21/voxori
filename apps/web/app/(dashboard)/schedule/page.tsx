export default function SchedulePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Schedule</h1>
      <p className="mt-2 text-gray-500">
        Connect your calendar so your agent can book showings and appointments.
      </p>
      <div className="mt-6 space-y-4">
        {['Google Calendar', 'Outlook / Office 365', 'Calendly', 'Acuity Scheduling'].map(
          (provider) => (
            <div
              key={provider}
              className="flex items-center justify-between rounded-lg border bg-white p-4"
            >
              <span className="font-medium">{provider}</span>
              <button className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                Connect
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
