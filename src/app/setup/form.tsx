"use client";

import { useActionState } from "react";
import { createOwner } from "./actions";

const input = "w-full rounded-lg border border-slate-300 px-3 py-2";

export function SetupForm() {
  const [error, action, pending] = useActionState(createOwner, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-12 w-12" />
          <h1 className="mt-3 text-xl font-semibold">Welcome to IVEVAR Books</h1>
          <p className="text-sm text-slate-500">Create the owner login. This page works only once.</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Your name</span>
          <input name="name" required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password (8+ characters)</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Password again</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {pending ? "Creating…" : "Create owner login"}
        </button>
      </form>
    </main>
  );
}
