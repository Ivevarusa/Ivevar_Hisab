import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/roles";
import { day, inr, label, money } from "@/lib/format";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { confirmPayment } from "../money/actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ pending?: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const { pending } = await searchParams;
  const where: Prisma.PaymentInWhereInput = {};
  if (user.role === "SALES") where.order = { salesExecId: user.id };
  if (pending === "1") where.confirmedById = null;
  const payments = await db.paymentIn.findMany({
    where,
    include: { account: true, confirmedBy: true, order: { include: { customer: true, salesExec: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
  const canConfirm = canSeeMoney(user.role);
  return (
    <>
      <PageHeader
        title="Payments received"
        subtitle="Add a payment from its order page."
        action={
          <Link href={pending === "1" ? "/payments" : "/payments?pending=1"} className="text-sm text-indigo-700">
            {pending === "1" ? "Show all" : "Show only unconfirmed"}
          </Link>
        }
      />
      <Card>
        <Table head={["Date", "Order", "Customer", "Type", "Method", "Account", "Amount", "In INR", "Confirmed"]} empty="No payments.">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <Td>{day(p.date)}</Td>
              <Td>
                <Link href={`/orders/${p.orderId}`} className="text-indigo-700">
                  #{p.order.orderNo}
                </Link>
              </Td>
              <Td>{p.order.customer.name}</Td>
              <Td>{label(p.kind)}</Td>
              <Td>{p.method}</Td>
              <Td>{p.account.name}</Td>
              <Td className={p.kind === "REFUND" ? "text-rose-700" : ""}>{(p.kind === "REFUND" ? "−" : "") + money(p.amount, p.account.currency)}</Td>
              <Td>{inr(p.amountInr)}</Td>
              <Td>
                {p.confirmedBy ? (
                  p.confirmedBy.name
                ) : canConfirm ? (
                  <form action={confirmPayment.bind(null, p.id)}>
                    <button className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white">Confirm</button>
                  </form>
                ) : (
                  <Badge tone="amber">Pending</Badge>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
