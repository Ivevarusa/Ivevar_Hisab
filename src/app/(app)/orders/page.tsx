import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeMoney, canSeePrices } from "@/lib/roles";
import { orderFinance, orderFinanceInclude } from "@/lib/finance";
import { day, inr, label, usd } from "@/lib/format";
import { ButtonLink, Card, PageHeader, Table, Td } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status";

const STATUSES: OrderStatus[] = ["ENQUIRY", "CONFIRMED", "IN_PRODUCTION", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; due?: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES", "DISPATCH"]);
  const { q, status, due } = await searchParams;

  const where: Prisma.SalesOrderWhereInput = {};
  if (user.role === "SALES") where.salesExecId = user.id;
  if (status && STATUSES.includes(status as OrderStatus)) where.status = status as OrderStatus;
  if (q) {
    const n = Number(q.replace("#", ""));
    where.OR = [
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { websiteOrderId: { contains: q, mode: "insensitive" } },
      { items: { some: { name: { contains: q, mode: "insensitive" } } } },
      ...(Number.isInteger(n) && n > 0 ? [{ orderNo: n }] : []),
    ];
  }

  const orders = await db.salesOrder.findMany({
    where,
    include: { customer: true, salesExec: true, items: true, ...orderFinanceInclude },
    orderBy: [{ date: "desc" }, { orderNo: "desc" }],
    take: 300,
  });
  let rows = orders.map((o) => ({ o, f: orderFinance(o) }));
  if (due === "1") rows = rows.filter((r) => r.f.balanceUsd > 0.009);

  const money = canSeeMoney(user.role);
  const prices = canSeePrices(user.role);

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${rows.length} orders`}
        action={user.role !== "DISPATCH" && <ButtonLink href="/orders/new">+ New order</ButtonLink>}
      />
      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search customer, product, order no." className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          {prices && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="due" value="1" defaultChecked={due === "1"} /> Balance due
            </label>
          )}
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Filter</button>
        </form>
        <Table head={["#", "Date", "Customer", "Items", "Status", ...(prices ? ["Value", "Balance due"] : []), ...(money ? ["Profit"] : []), "Sales exec"]} empty="No orders match.">
          {rows.map(({ o, f }) => (
            <tr key={o.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/orders/${o.id}`} className="font-medium text-indigo-700">
                  #{o.orderNo}
                </Link>
              </Td>
              <Td>{day(o.date)}</Td>
              <Td>
                <Link href={`/orders/${o.id}`}>{o.customer.name}</Link>
              </Td>
              <Td className="max-w-56 truncate">{o.items.map((i) => i.name).join(", ")}</Td>
              <Td>
                <OrderStatusBadge status={o.status} />
              </Td>
              {prices && <Td>{usd(f.totalUsd)}</Td>}
              {prices && <Td className={f.balanceUsd > 0.009 ? "font-medium text-rose-700" : "text-slate-400"}>{f.balanceUsd > 0.009 ? usd(f.balanceUsd) : "Paid"}</Td>}
              {money && <Td className={f.profitInr < 0 ? "text-rose-700" : ""}>{inr(f.profitInr)}</Td>}
              <Td>{o.salesExec?.name ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
