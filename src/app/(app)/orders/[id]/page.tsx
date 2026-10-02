import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeMoney, canSeePrices } from "@/lib/roles";
import { orderFinance, orderFinanceInclude } from "@/lib/finance";
import { day, inr, isoDay, label, money, usd } from "@/lib/format";
import { COURIERS, PAYMENT_METHODS } from "@/lib/constants";
import { Badge, Card, Field, FormGrid, Input, PageHeader, Select, Stat, Table, Td, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { OrderStatusBadge, ShipmentStatusBadge } from "@/components/status";
import { addPayment, addPurchase, addShipment, updateOrderStatus, updateShipment } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES", "DISPATCH"]);
  const { id } = await params;
  const order = await db.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      salesExec: true,
      items: true,
      ...orderFinanceInclude,
      payments: { include: { account: true, confirmedBy: true }, orderBy: { date: "asc" } },
      purchases: { include: { supplier: true }, orderBy: { date: "asc" } },
      shipments: { orderBy: { dispatchDate: "asc" } },
    },
  });
  if (!order) notFound();
  if (user.role === "SALES" && order.salesExecId !== user.id) notFound();

  const f = orderFinance(order);
  const money_ = canSeeMoney(user.role);
  const prices = canSeePrices(user.role);
  const [accounts, suppliers] = await Promise.all([
    prices ? db.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }) : [],
    money_ ? db.supplier.findMany({ orderBy: { name: "asc" } }) : [],
  ]);

  return (
    <>
      <PageHeader
        title={`Order #${order.orderNo}`}
        subtitle={
          <>
            {day(order.date)} · <Link href={`/customers/${order.customerId}`} className="text-indigo-700">{order.customer.name}</Link>
            {order.salesExec && ` · ${order.salesExec.name}`} · {label(order.source)}
            {order.websiteOrderId && ` · ${order.websiteOrderId}`}
          </>
        }
        action={<OrderStatusBadge status={order.status} />}
      />

      {prices && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Order value" value={usd(f.totalUsd)} hint={`${inr(f.valueInr)} at ₹${f.rate}`} />
          <Stat label="Received" value={usd(f.paidUsd)} hint={inr(f.paidInr)} />
          <Stat label="Balance due" value={f.balanceUsd > 0.009 ? usd(f.balanceUsd) : "Fully paid"} tone={f.balanceUsd > 0.009 ? "bad" : "good"} />
          {money_ && <Stat label="Profit" value={inr(f.profitInr)} hint={`Cost ${inr(f.costInr)}`} tone={f.profitInr >= 0 ? "good" : "bad"} />}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Items">
            <Table head={["Product", "Details", "Qty", ...(prices ? ["Price"] : [])]}>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <Td className="font-medium">{i.name}</Td>
                  <Td className="whitespace-normal text-slate-600">{[i.category, i.metal, i.stone, i.specs].filter(Boolean).join(" · ")}</Td>
                  <Td>{i.quantity}</Td>
                  {prices && <Td>{usd(i.priceUsd)}</Td>}
                </tr>
              ))}
            </Table>
            {(order.engraving || order.notes || order.isGift || order.requiredBy || order.priority) && (
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {order.priority && <div>Priority: {order.priority}</div>}
                {order.requiredBy && <div>Required before: {day(order.requiredBy)}</div>}
                {order.isGift && <div>Gift order</div>}
                {order.engraving && <div>Engraving: {order.engraving}</div>}
                {order.notes && <div>Notes: {order.notes}</div>}
              </div>
            )}
          </Card>

          {prices && (
            <Card title="Payments received">
              <Table head={["Date", "Type", "Method", "Account", "Amount", "In INR", "Confirmed"]} empty="No payments yet.">
                {order.payments.map((p) => (
                  <tr key={p.id}>
                    <Td>{day(p.date)}</Td>
                    <Td>{label(p.kind)}</Td>
                    <Td>{p.method}</Td>
                    <Td>{p.account.name}</Td>
                    <Td className={p.kind === "REFUND" ? "text-rose-700" : ""}>{(p.kind === "REFUND" ? "−" : "") + money(p.amount, p.account.currency)}</Td>
                    <Td>{inr(p.amountInr)}</Td>
                    <Td>{p.confirmedBy ? p.confirmedBy.name : <Badge tone="amber">Pending</Badge>}</Td>
                  </tr>
                ))}
              </Table>
              {user.role !== "DISPATCH" && order.status !== "CANCELLED" && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-indigo-700">+ Add payment</summary>
                  <ActionForm action={addPayment.bind(null, order.id)} submit="Save payment" className="mt-3 space-y-4">
                    <FormGrid>
                      <Field label="Date">
                        <Input name="date" type="date" defaultValue={isoDay()} required />
                      </Field>
                      <Field label="Type">
                        <Select
                          name="kind"
                          defaultValue={order.payments.length ? "BALANCE" : "DEPOSIT"}
                          options={[
                            { value: "DEPOSIT", label: "Deposit" },
                            { value: "BALANCE", label: "Balance" },
                            { value: "FULL", label: "Full payment" },
                            { value: "REFUND", label: "Refund to customer" },
                          ]}
                        />
                      </Field>
                      <Field label="Amount" hint="In the account's currency">
                        <Input name="amount" inputMode="decimal" required defaultValue={f.balanceUsd > 0 ? f.balanceUsd : undefined} />
                      </Field>
                      <Field label="Account">
                        <Select name="accountId" required placeholder="Choose…" options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))} />
                      </Field>
                      <Field label="Method">
                        <Select name="method" options={PAYMENT_METHODS} />
                      </Field>
                      <Field label="USD to INR rate">
                        <Input name="rate" inputMode="decimal" defaultValue={f.rate} />
                      </Field>
                      <Field label="Notes" className="sm:col-span-2">
                        <Input name="notes" />
                      </Field>
                    </FormGrid>
                  </ActionForm>
                </details>
              )}
            </Card>
          )}

          {money_ && (
            <Card title="Making cost and purchases">
              <Table head={["Date", "Supplier", "Description", "Bill no.", "Amount"]} empty="No making cost recorded yet.">
                {order.purchases.map((p) => (
                  <tr key={p.id}>
                    <Td>{day(p.date)}</Td>
                    <Td>
                      <Link href={`/suppliers/${p.supplierId}`} className="text-indigo-700">
                        {p.supplier.name}
                      </Link>
                    </Td>
                    <Td>{p.description}</Td>
                    <Td>{p.billNo}</Td>
                    <Td>{inr(p.amountInr)}</Td>
                  </tr>
                ))}
              </Table>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-indigo-700">+ Add making cost / purchase</summary>
                <ActionForm action={addPurchase.bind(null, order.id)} submit="Save purchase" className="mt-3 space-y-4">
                  <FormGrid>
                    <Field label="Date">
                      <Input name="date" type="date" defaultValue={isoDay()} required />
                    </Field>
                    <Field label="Supplier">
                      <Select name="supplierId" required placeholder="Choose…" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                    </Field>
                    <Field label="Description">
                      <Input name="description" required defaultValue="Making charge" />
                    </Field>
                    <Field label="Amount (INR)">
                      <Input name="amountInr" inputMode="decimal" required />
                    </Field>
                    <Field label="Bill no.">
                      <Input name="billNo" />
                    </Field>
                  </FormGrid>
                  {suppliers.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Add a supplier first on the <Link href="/suppliers" className="text-indigo-700">Suppliers</Link> page.
                    </p>
                  )}
                </ActionForm>
              </details>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Status">
            <ActionForm action={updateOrderStatus.bind(null, order.id)} submit="Update status" resetOnSuccess={false} className="flex gap-2">
              <Select
                name="status"
                defaultValue={order.status}
                options={["ENQUIRY", "CONFIRMED", "IN_PRODUCTION", "READY", "DISPATCHED", "DELIVERED", "CANCELLED"].map((s) => ({ value: s, label: label(s) }))}
              />
            </ActionForm>
          </Card>

          <Card title="Shipping">
            <div className="space-y-3">
              {order.shipments.length === 0 && <p className="text-sm text-slate-500">Not shipped yet.</p>}
              {order.shipments.map((s) => (
                <div key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.courier}</span>
                    <ShipmentStatusBadge status={s.status} />
                  </div>
                  <div className="mt-1 text-slate-600">{s.trackingNo ?? "No tracking number"}</div>
                  <div className="text-slate-500">
                    Dispatched {day(s.dispatchDate)}
                    {money_ && ` · cost ${inr(s.costInr)}`}
                    {s.trackingSent ? " · tracking sent" : " · tracking not sent"}
                  </div>
                  {user.role !== "SALES" && (
                    <ActionForm action={updateShipment.bind(null, s.id)} submit="Update" resetOnSuccess={false} className="mt-2 flex flex-wrap items-center gap-2">
                      <Select
                        name="status"
                        defaultValue={s.status}
                        className="w-auto"
                        options={["DISPATCHED", "IN_TRANSIT", "DELIVERED", "RETURNED"].map((x) => ({ value: x, label: label(x) }))}
                      />
                      <label className="flex items-center gap-1">
                        <input type="checkbox" name="trackingSent" defaultChecked={s.trackingSent} /> Tracking sent
                      </label>
                    </ActionForm>
                  )}
                </div>
              ))}
            </div>
            {user.role !== "SALES" && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-indigo-700">+ Add shipment</summary>
                <ActionForm action={addShipment.bind(null, order.id)} submit="Save shipment" className="mt-3 space-y-3">
                  <Field label="Courier">
                    <Select name="courier" options={COURIERS} />
                  </Field>
                  <Field label="Tracking number">
                    <Input name="trackingNo" />
                  </Field>
                  <Field label="Dispatch date">
                    <Input name="dispatchDate" type="date" defaultValue={isoDay()} />
                  </Field>
                  <Field label="Status">
                    <Select name="status" options={["DISPATCHED", "IN_TRANSIT", "DELIVERED"].map((x) => ({ value: x, label: label(x) }))} />
                  </Field>
                  {money_ && (
                    <Field label="Courier cost (INR)">
                      <Input name="costInr" inputMode="decimal" />
                    </Field>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="trackingSent" /> Tracking sent to customer
                  </label>
                  <Field label="Notes">
                    <Textarea name="notes" />
                  </Field>
                </ActionForm>
              </details>
            )}
          </Card>

          <Card title="Customer">
            <div className="space-y-1 text-sm">
              <Link href={`/customers/${order.customerId}`} className="font-medium text-indigo-700">
                {order.customer.name}
              </Link>
              {order.customer.whatsapp && <div>WhatsApp: {order.customer.whatsapp}</div>}
              {order.customer.phone && <div>Phone: {order.customer.phone}</div>}
              {order.customer.email && <div>{order.customer.email}</div>}
              <div className="text-slate-600">
                {[order.customer.address, order.customer.city, order.customer.state, order.customer.zip, order.customer.country].filter(Boolean).join(", ")}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
