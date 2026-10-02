"use client";

import { useActionState } from "react";

export function ImportForm({ action }: { action: (prev: string | undefined, f: FormData) => Promise<string | undefined> }) {
  const [message, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-3">
      <input type="file" name="file" accept=".xlsx" className="block w-full text-sm" />
      {message && <p className={`rounded-lg px-3 py-2 text-sm ${message.startsWith("Done") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{message}</p>}
      <button disabled={pending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? "Importing…" : "Import"}
      </button>
    </form>
  );
}
