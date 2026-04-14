export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-gray-500">Manage your account, billing, and notifications.</p>
      <div className="mt-6 space-y-6">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Billing</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your subscription and view usage.
          </p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Team Members</h2>
          <p className="mt-1 text-sm text-gray-500">
            Invite team members and manage roles.
          </p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Phone Number</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your dedicated phone number.
          </p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure missed call alerts and daily digest emails.
          </p>
        </section>
      </div>
    </div>
  );
}
