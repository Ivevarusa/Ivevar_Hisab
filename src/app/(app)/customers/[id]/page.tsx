import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeePrices } from "@/lib/roles";
import { orderFinance, orderFinanceInclude } from "@/lib/finance";
import { day, usd } from "@/lib/format";
import { ButtonLink, Card, PageHeader, Stat, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { OrderStatusBadge } from "@/components/status";
import { CustomerFields } from "../fields";
import { updateCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const { id } = await params;
  const c = await db.customer.findUnique({
    where: { id },
    include: { orders: { include: { items: true, ...orderFinanceInclude }, orderBy: { date: "desc" } } },
  });
  if (!c) notFound();
  const orders = c.orders
    .filter((o) => user.role !== "SALES" || o.salesExecId === user.id)
    .map((o) => ({ o, f: orderFinance(o) }));
  const totalUsd = orders.filter(({ o }) => o.status !== "CANCELLED").reduce((s, r) => s + r.f.totalUsd, 0);
  const dueUsd = orders.reduce((s, r) => s + Math.max(0, r.f.balanceUsd), 0);
  const prices = canSeePrices(user.role);

  return (
    <>
      <PageHeader title={c.name} subtitle={[c.city, c.country].filter(Boolean).join(", ")} action={<ButtonLink href={`/orders/new?customer=${c.id}`}>+ New order</ButtonLink>} />
      {prices && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Stat label="Orders" value={orders.length} />
          <Stat label="Total bought" value={usd(totalUsd)} />
          <Stat label="Still owes" value={usd(dueUsd)} tone={dueUsd > 0.009 ? "bad" : undefined} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Orders">
          <Table head={["#", "Date", "Items", "Status", ...(prices ? ["Value"] : [])]} empty="No orders yet.">
            {orders.map(({ o, f }) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/orders/${o.id}`} className="text-indigo-700">
                    #{o.orderNo}
                  </Link>
                </Td>
                <Td>{day(o.date)}</Td>
                <Td className="max-w-48 truncate">{o.items.map((i) => i.name).join(", ")}</Td>
                <Td>
                  <OrderStatusBadge status={o.status} />
                </Td>
                {prices && <Td>{usd(f.totalUsd)}</Td>}
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Details">
          <ActionForm action={updateCustomer.bind(null, c.id)} submit="Save changes" resetOnSuccess={false}>
            <CustomerFields c={c} />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
