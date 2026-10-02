"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { ErrorNote } from "./ui";

/** A form bound to a server action that returns an error message (or nothing on success). */
export function ActionForm({
  action,
  children,
  submit = "Save",
  className = "space-y-4",
  resetOnSuccess = true,
}: {
  action: (prev: string | undefined, form: FormData) => Promise<string | undefined>;
  children: ReactNode;
  submit?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [error, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !error && resetOnSuccess) ref.current?.reset();
    if (pending) submitted.current = true;
  }, [pending, error, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      <ErrorNote message={error} />
      <button
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submit}
      </button>
    </form>
  );
}
