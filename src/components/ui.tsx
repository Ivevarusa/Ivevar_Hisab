import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold text-slate-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  return (
    <Link href={href} className={btnClass(variant)}>
      {children}
    </Link>
  );
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "danger" }) {
  return <button {...props} className={`${btnClass(variant)} ${className}`} />;
}

function btnClass(variant: "primary" | "secondary" | "danger") {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  if (variant === "secondary") return `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
  if (variant === "danger") return `${base} bg-rose-600 text-white hover:bg-rose-700`;
  return `${base} bg-indigo-600 text-white hover:bg-indigo-700`;
}

export function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={2} {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select({ options, placeholder, ...props }: ComponentProps<"select"> & { options: (string | { value: string; label: string })[]; placeholder?: string }) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
    </select>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    blue: "bg-sky-100 text-sky-800",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** A table that scrolls sideways on a phone instead of breaking the page. */
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2 font-medium sm:px-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {!hasRows && <p className="px-4 py-6 text-center text-sm text-slate-500">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-2 sm:px-3 ${className}`}>{children}</td>;
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>;
}
