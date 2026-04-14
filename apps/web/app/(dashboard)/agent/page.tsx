export default function AgentPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">My Agent</h1>
      <p className="mt-2 text-gray-500">Configure your AI voice agent.</p>
      <div className="mt-6 space-y-6">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Agent Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Set your agent's name, voice, and behavior.
          </p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Voice</h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload audio samples to clone your voice, or choose a preset.
          </p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">System Prompt</h2>
          <p className="mt-1 text-sm text-gray-500">
            Customize how your agent responds to callers.
          </p>
        </section>
      </div>
    </div>
  );
}
