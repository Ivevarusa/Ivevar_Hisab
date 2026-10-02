import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { day, inr, isoDay } from "@/lib/format";
import { monthRange } from "@/lib/finance";
import { Card, Field, FormGrid, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createPurchase } from "../money/actions";

export default async function PurchasesPage() {
  await requireUser(["OWNER", "ACCOUNTS"]);
  const [purchases, suppliers] = await Promise.all([
    db.purchase.findMany({ include: { supplier: true, order: { include: { customer: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 300 }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  const { start } = monthRange();
  const thisMonth = purchases.filter((p) => p.date >= start).reduce((s, p) => s + Number(p.amountInr), 0);
  return (
    <>
      <PageHeader title="Purchases" subtitle={`${inr(thisMonth)} this month`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Table head={["Date", "Supplier", "Description", "Order", "Bill no.", "Amount"]} empty="No purchases yet.">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td>{day(p.date)}</Td>
                <Td>
                  <Link href={`/suppliers/${p.supplierId}`} className="text-indigo-700">
                    {p.supplier.name}
                  </Link>
                </Td>
                <Td>{p.description}</Td>
                <Td>
                  {p.order && (
                    <Link href={`/orders/${p.orderId}`} className="text-indigo-700">
                      #{p.order.orderNo} {p.order.customer.name}
                    </Link>
                  )}
                </Td>
                <Td>{p.billNo}</Td>
                <Td>{inr(p.amountInr)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Add purchase">
          <ActionForm action={createPurchase} submit="Save purchase">
            <FormGrid>
              <Field label="Date">
                <Input name="date" type="date" defaultValue={isoDay()} required />
              </Field>
              <Field label="Amount (INR)">
                <Input name="amountInr" inputMode="decimal" required />
              </Field>
            </FormGrid>
            <Field label="Supplier">
              <Select name="supplierId" required placeholder="Choose…" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
            <Field label="Description">
              <Input name="description" required placeholder="Making charge, gold, stones…" />
            </Field>
            <FormGrid>
              <Field label="For order no." hint="Leave empty for stock or general">
                <Input name="orderNo" inputMode="numeric" />
              </Field>
              <Field label="Bill no.">
                <Input name="billNo" />
              </Field>
            </FormGrid>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
