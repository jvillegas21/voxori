export default function CallDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Call Detail</h1>
      <p className="mt-2 text-gray-500">Call ID: {params.id}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Transcript</h2>
          <p className="mt-2 text-sm text-gray-400">Transcript loading...</p>
        </section>
        <section className="rounded-lg border bg-white p-6">
          <h2 className="font-semibold">Recording</h2>
          <p className="mt-2 text-sm text-gray-400">Audio player coming soon.</p>
        </section>
      </div>
    </div>
  );
}
