export function NoDatabase() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm space-y-2 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Database is not connected yet</h1>
        <p className="text-sm text-slate-600">In Vercel, open this project, go to Storage, connect Supabase, then press Redeploy.</p>
      </div>
    </main>
  );
}
