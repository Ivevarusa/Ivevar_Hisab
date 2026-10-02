import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/roles";
import { accountBalances, monthRange, orderFinance, orderFinanceInclude, supplierBalances } from "@/lib/finance";
import { day, inr, money, num, usd } from "@/lib/format";
import { getUsdInrRate } from "@/lib/settings";
import { ButtonLink, Card, PageHeader, Stat, Table, Td } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const { month } = await searchParams;
  const { start, end, key } = monthRange(month);
  const monthName = start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  if (user.role === "MARKETING") {
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} />
        <Card>The daily work report arrives in phase 3.</Card>
      </>
    );
  }

  const ownOnly = user.role === "SALES" ? { salesExecId: user.id } : {};
  const [monthOrders, openOrders, toDispatch] = await Promise.all([
    db.salesOrder.findMany({ where: { ...ownOnly, date: { gte: start, lt: end }, status: { not: "CANCELLED" } }, include: { salesExec: true, ...orderFinanceInclude } }),
    db.salesOrder.findMany({ where: { ...ownOnly, status: { notIn: ["CANCELLED"] } }, include: { customer: true, ...orderFinanceInclude } }),
    db.salesOrder.findMany({
      where: { ...ownOnly, status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY"] } },
      include: { customer: true, items: true },
      orderBy: [{ requiredBy: { sort: "asc", nulls: "last" } }, { date: "asc" }],
      take: 15,
    }),
  ]);

  const sales = monthOrders.map((o) => ({ o, f: orderFinance(o) }));
  const salesUsd = sales.reduce((s, r) => s + r.f.totalUsd, 0);
  const receivables = openOrders.map((o) => ({ o, f: orderFinance(o) })).filter((r) => r.f.balanceUsd > 0.009);
  const receivableUsd = receivables.reduce((s, r) => s + r.f.balanceUsd, 0);

  const dispatchCard = (
    <Card title="Waiting to ship" action={<Link href="/orders?status=READY" className="text-sm text-indigo-700">Ready orders</Link>}>
      <Table head={["#", "Customer", "Items", "Status", "Required by"]} empty="Nothing waiting.">
        {toDispatch.map((o) => (
          <tr key={o.id}>
            <Td>
              <Link href={`/orders/${o.id}`} className="text-indigo-700">
                #{o.orderNo}
              </Link>
            </Td>
            <Td>{o.customer.name}</Td>
            <Td className="max-w-48 truncate">{o.items.map((i) => i.name).join(", ")}</Td>
            <Td>
              <OrderStatusBadge status={o.status} />
            </Td>
            <Td>{day(o.requiredBy)}</Td>
          </tr>
        ))}
      </Table>
    </Card>
  );

  if (user.role === "DISPATCH") {
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} />
        {dispatchCard}
      </>
    );
  }

  const monthPicker = (
    <form className="flex gap-2">
      <input type="month" name="month" defaultValue={key} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Show</button>
    </form>
  );

  if (!canSeeMoney(user.role)) {
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} subtitle={monthName} action={<ButtonLink href="/orders/new">+ New order</ButtonLink>} />
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="My orders this month" value={sales.length} />
          <Stat label="My sales this month" value={usd(salesUsd)} />
          <Stat label="Customers still owe me" value={usd(receivableUsd)} tone={receivableUsd > 0 ? "bad" : undefined} />
        </div>
        {dispatchCard}
      </>
    );
  }

  // Owner and accounts
  const [accounts, suppliers, rate, expenseAgg, receivedAgg, unconfirmed] = await Promise.all([
    accountBalances(),
    supplierBalances(),
    getUsdInrRate(),
    db.expense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amountInr: true } }),
    db.paymentIn.groupBy({ by: ["kind"], where: { date: { gte: start, lt: end } }, _sum: { amountInr: true } }),
    db.paymentIn.count({ where: { confirmedById: null } }),
  ]);
  const salesInr = sales.reduce((s, r) => s + r.f.valueInr, 0);
  const grossProfit = sales.reduce((s, r) => s + r.f.profitInr, 0);
  const expensesInr = num(expenseAgg._sum.amountInr);
  const receivedInr = receivedAgg.reduce((s, r) => s + (r.kind === "REFUND" ? -1 : 1) * num(r._sum.amountInr), 0);
  const payableInr = suppliers.reduce((s, x) => s + Math.max(0, x.owedInr), 0);
  const liveAccounts = accounts.filter((a) => a.active);
  const cashInr = liveAccounts.reduce((s, a) => s + (a.currency === "INR" ? a.balance : a.balance * rate), 0);

  const byExec = Object.values(
    sales.reduce<Record<string, { name: string; orders: number; usd: number; profit: number }>>((m, { o, f }) => {
      const k = o.salesExec?.id ?? "none";
      m[k] ??= { name: o.salesExec?.name ?? "No sales exec", orders: 0, usd: 0, profit: 0 };
      m[k].orders++;
      m[k].usd += f.totalUsd;
      m[k].profit += f.profitInr;
      return m;
    }, {}),
  ).sort((a, b) => b.profit - a.profit);

  return (
    <>
      <PageHeader title={`Hello, ${user.name}`} subtitle={monthName} action={monthPicker} />
      {unconfirmed > 0 && (
        <Link href="/payments?pending=1" className="mb-4 block rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unconfirmed} payment{unconfirmed > 1 ? "s" : ""} waiting for your confirmation →
        </Link>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales" value={usd(salesUsd)} hint={`${sales.length} orders · ${inr(salesInr)}`} />
        <Stat label="Gross profit" value={inr(grossProfit)} hint="Sales minus making and courier" tone={grossProfit >= 0 ? "good" : "bad"} />
        <Stat label="Expenses" value={inr(expensesInr)} hint={<Link href={`/expenses?month=${key}`} className="text-indigo-700">See expenses</Link>} />
        <Stat label="Net profit" value={inr(grossProfit - expensesInr)} tone={grossProfit - expensesInr >= 0 ? "good" : "bad"} />
        <Stat label="Money received" value={inr(receivedInr)} hint="This month, all accounts" />
        <Stat label="Customers owe us" value={usd(receivableUsd)} hint={`${receivables.length} orders`} tone={receivableUsd > 0 ? "bad" : undefined} />
        <Stat label="We owe suppliers" value={inr(payableInr)} hint={<Link href="/suppliers" className="text-indigo-700">See suppliers</Link>} tone={payableInr > 0 ? "bad" : undefined} />
        <Stat label="Cash and bank" value={inr(cashInr)} hint={<Link href="/accounts" className="text-indigo-700">See accounts</Link>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profit by sales executive">
          <Table head={["Name", "Orders", "Sales", "Profit"]} empty="No orders this month.">
            {byExec.map((e) => (
              <tr key={e.name}>
                <Td className="font-medium">{e.name}</Td>
                <Td>{e.orders}</Td>
                <Td>{usd(e.usd)}</Td>
                <Td>{inr(e.profit)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Account balances">
          <Table head={["Account", "Balance"]}>
            {liveAccounts.map((a) => (
              <tr key={a.id}>
                <Td>
                  <Link href={`/accounts/${a.id}`} className="text-indigo-700">
                    {a.name}
                  </Link>
                </Td>
                <Td className={a.balance < 0 ? "text-rose-700" : ""}>{money(a.balance, a.currency)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Biggest balances due" action={<Link href="/orders?due=1" className="text-sm text-indigo-700">All</Link>}>
          <Table head={["#", "Customer", "Due"]} empty="Nobody owes us.">
            {receivables
              .sort((a, b) => b.f.balanceUsd - a.f.balanceUsd)
              .slice(0, 8)
              .map(({ o, f }) => (
                <tr key={o.id}>
                  <Td>
                    <Link href={`/orders/${o.id}`} className="text-indigo-700">
                      #{o.orderNo}
                    </Link>
                  </Td>
                  <Td>{o.customer.name}</Td>
                  <Td className="text-rose-700">{usd(f.balanceUsd)}</Td>
                </tr>
              ))}
          </Table>
        </Card>
        {dispatchCard}
      </div>
    </>
  );
}
