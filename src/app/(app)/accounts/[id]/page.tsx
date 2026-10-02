import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { accountLedger } from "@/lib/finance";
import { day, label, money } from "@/lib/format";
import { Card, PageHeader, Table, Td } from "@/components/ui";
import { db } from "@/lib/db";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["OWNER", "ACCOUNTS"]);
  const { id } = await params;
  if (!(await db.account.findUnique({ where: { id } }))) notFound();
  const { account, rows, balance } = await accountLedger(id);
  const m = (v: number) => money(v, account.currency);
  return (
    <>
      <PageHeader
        title={account.name}
        subtitle={`${label(account.type)} · opening balance ${m(Number(account.openingBalance))}`}
        action={<div className="text-right"><div className="text-xs text-slate-500">Balance now</div><div className="text-2xl font-semibold">{m(balance)}</div></div>}
      />
      <Card title="Cash book">
        <Table head={["Date", "Type", "Details", "In", "Out", "Balance"]} empty="No entries yet.">
          {rows.map((r, i) => (
            <tr key={i}>
              <Td>{day(r.date)}</Td>
              <Td>{r.kind}</Td>
              <Td className="whitespace-normal">{r.href ? <Link href={r.href} className="text-indigo-700">{r.description}</Link> : r.description}</Td>
              <Td className="text-emerald-700">{r.moneyIn ? m(r.moneyIn) : ""}</Td>
              <Td className="text-rose-700">{r.moneyOut ? m(r.moneyOut) : ""}</Td>
              <Td className="font-medium">{m(r.balance)}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
