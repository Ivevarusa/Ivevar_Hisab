import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { day, inr, isoDay, label, money } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { Card, Field, FormGrid, Input, PageHeader, Select, Stat, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createSupplierPayment } from "../../money/actions";
import { num } from "@/lib/format";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["OWNER", "ACCOUNTS"]);
  const { id } = await params;
  const s = await db.supplier.findUnique({
    where: { id },
    include: {
      purchases: { include: { order: true } },
      shipments: { include: { order: true } },
      payments: { include: { account: true } },
    },
  });
  if (!s) notFound();
  const accounts = await db.account.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  type Row = { date: Date; what: string; href?: string; billed: number; paid: number; paidLabel?: string };
  const rows: Row[] = [
    ...s.purchases.map((p) => ({
      date: p.date,
      what: `${p.description}${p.billNo ? ` · bill ${p.billNo}` : ""}${p.order ? ` · order #${p.order.orderNo}` : ""}`,
      href: p.orderId ? `/orders/${p.orderId}` : undefined,
      billed: num(p.amountInr),
      paid: 0,
    })),
    ...s.shipments.map((sh) => ({
      date: sh.dispatchDate,
      what: `Shipping ${sh.trackingNo ?? ""} · order #${sh.order.orderNo}`,
      href: `/orders/${sh.orderId}`,
      billed: num(sh.costInr),
      paid: 0,
    })),
    ...s.payments.map((p) => ({
      date: p.date,
      what: `Payment from ${p.account.name}${p.notes ? ` · ${p.notes}` : ""}`,
      billed: 0,
      paid: num(p.amountInr),
      paidLabel: p.account.currency !== "INR" ? money(p.amount, p.account.currency) : undefined,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const billed = rows.reduce((x, r) => x + r.billed, 0);
  const paid = rows.reduce((x, r) => x + r.paid, 0);

  return (
    <>
      <PageHeader title={s.name} subtitle={`${label(s.type)}${s.phone ? ` · ${s.phone}` : ""}${s.gstNo ? ` · GST ${s.gstNo}` : ""}`} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Billed" value={inr(billed)} />
        <Stat label="Paid" value={inr(paid)} />
        <Stat label="We owe" value={inr(billed - paid)} tone={billed - paid > 0 ? "bad" : "good"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Statement" className="lg:col-span-2">
          <Table head={["Date", "Entry", "Bill", "Paid"]} empty="No entries yet.">
            {rows.map((r, i) => (
              <tr key={i}>
                <Td>{day(r.date)}</Td>
                <Td className="whitespace-normal">{r.href ? <Link href={r.href} className="text-indigo-700">{r.what}</Link> : r.what}</Td>
                <Td>{r.billed ? inr(r.billed) : ""}</Td>
                <Td>{r.paid ? `${inr(r.paid)}${r.paidLabel ? ` (${r.paidLabel})` : ""}` : ""}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Pay this supplier">
          <ActionForm action={createSupplierPayment} submit="Save payment">
            <input type="hidden" name="supplierId" value={s.id} />
            <FormGrid>
              <Field label="Date">
                <Input name="date" type="date" defaultValue={isoDay()} required />
              </Field>
              <Field label="Amount" hint="In the account's currency">
                <Input name="amount" inputMode="decimal" required />
              </Field>
            </FormGrid>
            <Field label="Paid from">
              <Select name="accountId" required placeholder="Choose…" options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))} />
            </Field>
            <Field label="Method">
              <Select name="method" options={PAYMENT_METHODS} />
            </Field>
            <Field label="Notes">
              <Input name="notes" />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
