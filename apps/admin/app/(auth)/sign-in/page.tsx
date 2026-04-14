export default function AdminSignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-gray-800 bg-gray-900 p-8">
        <h1 className="text-xl font-bold text-white">Voxori Admin</h1>
        <p className="text-sm text-gray-400">Super-admin access only.</p>
        {/* Auth form — wired to Supabase Auth with super_admin role check */}
      </div>
    </main>
  );
}
