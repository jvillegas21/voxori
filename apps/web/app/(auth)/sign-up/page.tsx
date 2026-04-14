export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-gray-500">
          Start your free trial today.
        </p>
        {/* Sign up form — wired to Supabase Auth in Phase 1 implementation */}
      </div>
    </main>
  );
}
