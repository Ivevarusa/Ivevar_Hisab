"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

type Item = { href: string; label: string; icon: string; roles?: Role[]; mobile?: boolean };

const MONEY: Role[] = ["OWNER", "ACCOUNTS"];

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z", mobile: true },
  { href: "/orders", label: "Orders", icon: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8", roles: ["OWNER", "ACCOUNTS", "SALES", "DISPATCH"], mobile: true },
  { href: "/customers", label: "Customers", icon: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0", roles: ["OWNER", "ACCOUNTS", "SALES"] },
  { href: "/payments", label: "Payments in", icon: "M12 3v18M17 7H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", roles: ["OWNER", "ACCOUNTS", "SALES"], mobile: true },
  { href: "/purchases", label: "Purchases", icon: "M3 3h2l2 13h12l2-9H6M9 20a1 1 0 100 .01M18 20a1 1 0 100 .01", roles: MONEY },
  { href: "/suppliers", label: "Suppliers", icon: "M3 21V8l9-5 9 5v13M9 21v-6h6v6", roles: MONEY },
  { href: "/expenses", label: "Expenses", icon: "M4 4h16v16H4zM8 9h8M8 13h8M8 17h4", roles: MONEY, mobile: true },
  { href: "/accounts", label: "Cash & Bank", icon: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 21h20M12 3l9 5H3z", roles: MONEY, mobile: true },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z", roles: ["OWNER"] },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function Nav({ role, name, logout }: { role: Role; name: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => !i.roles || i.roles.includes(role));
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* PC: sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-semibold">IVEVAR Books</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(i.href) ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon d={i.icon} />
              {i.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="border-t border-slate-200 px-5 py-4 text-sm">
          <div className="font-medium text-slate-800">{name}</div>
          <button className="text-slate-500 hover:text-slate-800">Sign out</button>
        </form>
      </aside>

      {/* Phone: top bar + bottom tabs */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/icon.svg" alt="" className="h-7 w-7" /> IVEVAR
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-1 text-sm">Menu</summary>
          <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                <Icon d={i.icon} />
                {i.label}
              </Link>
            ))}
            <form action={logout} className="mt-1 border-t border-slate-100 px-3 pt-2 text-sm">
              <div className="text-slate-500">{name}</div>
              <button className="font-medium text-slate-700">Sign out</button>
            </form>
          </div>
        </details>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items
          .filter((i) => i.mobile)
          .map((i) => (
            <Link key={i.href} href={i.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active(i.href) ? "text-indigo-700" : "text-slate-500"}`}>
              <Icon d={i.icon} />
              {i.label}
            </Link>
          ))}
      </nav>
    </>
  );
}
