export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Platform Settings</h1>
      <p className="mt-2 text-gray-400">Global configuration for the Voxori platform.</p>
      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold">Plan Configuration</h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage plan tiers, pricing, and included minutes.
          </p>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold">System Prompt Templates</h2>
          <p className="mt-1 text-sm text-gray-400">
            Default prompts per vertical used when onboarding new clients.
          </p>
        </section>
        <section className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="font-semibold">Feature Flags</h2>
          <p className="mt-1 text-sm text-gray-400">
            Enable or disable features per plan tier.
          </p>
        </section>
      </div>
    </div>
  );
}
