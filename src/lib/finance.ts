import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { num } from "./format";

/** Every money figure here is calculated from the records, never typed in. */

export const orderFinanceInclude = {
  payments: { include: { account: true } },
  purchases: true,
  shipments: true,
} satisfies Prisma.SalesOrderInclude;

type OrderWithMoney = Prisma.SalesOrderGetPayload<{ include: typeof orderFinanceInclude }>;

export function orderFinance(order: OrderWithMoney) {
  const rate = num(order.usdInrRate);
  const totalUsd = num(order.totalUsd);
  const valueInr = totalUsd * rate;

  let paidUsd = 0;
  let paidInr = 0;
  for (const p of order.payments) {
    const sign = p.kind === "REFUND" ? -1 : 1;
    const inUsd = p.account.currency === "USD" ? num(p.amount) : num(p.amountInr) / rate;
    paidUsd += sign * inUsd;
    paidInr += sign * num(p.amountInr);
  }

  const makingInr = order.purchases.reduce((s, p) => s + num(p.amountInr), 0);
  const courierInr = order.shipments.reduce((s, sh) => s + num(sh.costInr), 0);
  const costInr = makingInr + courierInr;

  return {
    totalUsd,
    rate,
    valueInr,
    paidUsd,
    paidInr,
    balanceUsd: order.status === "CANCELLED" ? 0 : round2(totalUsd - paidUsd),
    makingInr,
    courierInr,
    costInr,
    profitInr: order.status === "CANCELLED" ? 0 : valueInr - costInr,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function accountBalances() {
  const [accounts, pin, pout, exp, tFrom, tTo] = await Promise.all([
    db.account.findMany({ orderBy: { name: "asc" } }),
    db.paymentIn.groupBy({ by: ["accountId", "kind"], _sum: { amount: true } }),
    db.paymentOut.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    db.expense.groupBy({ by: ["accountId"], _sum: { amount: true } }),
    db.transfer.groupBy({ by: ["fromAccountId"], _sum: { amountFrom: true } }),
    db.transfer.groupBy({ by: ["toAccountId"], _sum: { amountTo: true } }),
  ]);

  return accounts.map((a) => {
    let bal = num(a.openingBalance);
    for (const r of pin.filter((r) => r.accountId === a.id)) bal += (r.kind === "REFUND" ? -1 : 1) * num(r._sum.amount);
    bal -= num(pout.find((r) => r.accountId === a.id)?._sum.amount);
    bal -= num(exp.find((r) => r.accountId === a.id)?._sum.amount);
    bal -= num(tFrom.find((r) => r.fromAccountId === a.id)?._sum.amountFrom);
    bal += num(tTo.find((r) => r.toAccountId === a.id)?._sum.amountTo);
    return { ...a, balance: round2(bal) };
  });
}

export type LedgerRow = {
  date: Date;
  kind: string;
  description: string;
  href?: string;
  moneyIn: number;
  moneyOut: number;
  balance: number;
};

export async function accountLedger(accountId: string) {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });
  const [pin, pout, exp, tFrom, tTo] = await Promise.all([
    db.paymentIn.findMany({ where: { accountId }, include: { order: { include: { customer: true } } } }),
    db.paymentOut.findMany({ where: { accountId }, include: { supplier: true } }),
    db.expense.findMany({ where: { accountId } }),
    db.transfer.findMany({ where: { fromAccountId: accountId }, include: { toAccount: true } }),
    db.transfer.findMany({ where: { toAccountId: accountId }, include: { fromAccount: true } }),
  ]);

  const rows: Omit<LedgerRow, "balance">[] = [
    ...pin.map((p) => ({
      date: p.date,
      kind: p.kind === "REFUND" ? "Refund" : "Payment in",
      description: `Order #${p.order.orderNo} · ${p.order.customer.name}`,
      href: `/orders/${p.orderId}`,
      moneyIn: p.kind === "REFUND" ? 0 : num(p.amount),
      moneyOut: p.kind === "REFUND" ? num(p.amount) : 0,
    })),
    ...pout.map((p) => ({
      date: p.date,
      kind: "Supplier payment",
      description: p.supplier.name + (p.notes ? ` · ${p.notes}` : ""),
      href: `/suppliers/${p.supplierId}`,
      moneyIn: 0,
      moneyOut: num(p.amount),
    })),
    ...exp.map((e) => ({
      date: e.date,
      kind: "Expense",
      description: `${e.category} · ${e.description}`,
      moneyIn: 0,
      moneyOut: num(e.amount),
    })),
    ...tFrom.map((t) => ({
      date: t.date,
      kind: "Transfer out",
      description: `To ${t.toAccount.name}` + (t.notes ? ` · ${t.notes}` : ""),
      moneyIn: 0,
      moneyOut: num(t.amountFrom),
    })),
    ...tTo.map((t) => ({
      date: t.date,
      kind: "Transfer in",
      description: `From ${t.fromAccount.name}` + (t.notes ? ` · ${t.notes}` : ""),
      moneyIn: num(t.amountTo),
      moneyOut: 0,
    })),
  ];

  rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  let bal = num(account.openingBalance);
  const withBalance: LedgerRow[] = rows.map((r) => {
    bal = round2(bal + r.moneyIn - r.moneyOut);
    return { ...r, balance: bal };
  });
  return { account, rows: withBalance.reverse(), balance: bal };
}

export async function supplierBalances() {
  const [suppliers, pur, ship, paid] = await Promise.all([
    db.supplier.findMany({ orderBy: { name: "asc" } }),
    db.purchase.groupBy({ by: ["supplierId"], _sum: { amountInr: true } }),
    db.shipment.groupBy({ by: ["supplierId"], _sum: { costInr: true } }),
    db.paymentOut.groupBy({ by: ["supplierId"], _sum: { amountInr: true } }),
  ]);
  return suppliers.map((s) => {
    const billed =
      num(pur.find((r) => r.supplierId === s.id)?._sum.amountInr) +
      num(ship.find((r) => r.supplierId === s.id)?._sum.costInr);
    const paidInr = num(paid.find((r) => r.supplierId === s.id)?._sum.amountInr);
    return { ...s, billedInr: billed, paidInr, owedInr: round2(billed - paidInr) };
  });
}

export function monthRange(month?: string) {
  // month = "yyyy-mm"; defaults to the current month (UTC)
  const now = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end, key: `${y}-${String(m).padStart(2, "0")}` };
}
