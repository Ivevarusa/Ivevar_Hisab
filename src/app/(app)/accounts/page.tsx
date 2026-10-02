import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accountBalances } from "@/lib/finance";
import { day, inr, isoDay, label, money } from "@/lib/format";
import { getUsdInrRate } from "@/lib/settings";
import { Card, Field, FormGrid, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createAccount, createTransfer } from "../money/actions";

export default async function AccountsPage() {
  const user = await requireUser(["OWNER", "ACCOUNTS"]);
  const [accounts, rate, transfers] = await Promise.all([
    accountBalances(),
    getUsdInrRate(),
    db.transfer.findMany({ include: { fromAccount: true, toAccount: true }, orderBy: { date: "desc" }, take: 10 }),
  ]);
  const live = accounts.filter((a) => a.active);
  const totalInr = live.reduce((s, a) => s + (a.currency === "INR" ? a.balance : a.balance * rate), 0);
  const opts = live.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }));

  return (
    <>
      <PageHeader title="Cash & Bank" subtitle={`All accounts together: about ${inr(totalInr)} (USD at ₹${rate})`} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {live.map((a) => (
          <Link key={a.id} href={`/accounts/${a.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {a.name} · {label(a.type)}
            </div>
            <div className={`mt-1 text-xl font-semibold ${a.balance < 0 ? "text-rose-700" : ""}`}>{money(a.balance, a.currency)}</div>
          </Link>
        ))}
      </div>
      {accounts.some((a) => !a.active) && (
        <p className="-mt-2 mb-4 text-xs text-slate-500">
          Closed accounts, not counted above:{" "}
          {accounts
            .filter((a) => !a.active)
            .map((a) => (
              <Link key={a.id} href={`/accounts/${a.id}`} className="mr-2 text-indigo-700">
                {a.name}
              </Link>
            ))}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Move money between accounts">
          <ActionForm action={createTransfer} submit="Save transfer">
            <FormGrid>
              <Field label="From">
                <Select name="fromAccountId" required placeholder="Choose…" options={opts} />
              </Field>
              <Field label="To">
                <Select name="toAccountId" required placeholder="Choose…" options={opts} />
              </Field>
              <Field label="Amount sent" hint="In the 'from' account's currency">
                <Input name="amountFrom" inputMode="decimal" required />
              </Field>
              <Field label="Amount received" hint="Only if the currency is different, e.g. Stripe USD to bank INR">
                <Input name="amountTo" inputMode="decimal" />
              </Field>
              <Field label="Date">
                <Input name="date" type="date" defaultValue={isoDay()} />
              </Field>
              <Field label="Notes">
                <Input name="notes" />
              </Field>
            </FormGrid>
          </ActionForm>
          {transfers.length > 0 && (
            <div className="mt-4">
              <Table head={["Date", "From", "To", "Sent", "Received"]}>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <Td>{day(t.date)}</Td>
                    <Td>{t.fromAccount.name}</Td>
                    <Td>{t.toAccount.name}</Td>
                    <Td>{money(t.amountFrom, t.fromAccount.currency)}</Td>
                    <Td>{money(t.amountTo, t.toAccount.currency)}</Td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </Card>
        {user.role === "OWNER" && (
          <Card title="Add account">
            <ActionForm action={createAccount} submit="Add account">
              <FormGrid>
                <Field label="Name">
                  <Input name="name" required placeholder="HDFC current account" />
                </Field>
                <Field label="Type">
                  <Select
                    name="type"
                    options={[
                      { value: "BANK", label: "Bank" },
                      { value: "CASH", label: "Cash" },
                      { value: "GATEWAY", label: "Payment gateway (Stripe, PayPal)" },
                      { value: "WALLET", label: "Wallet (Zelle, crypto)" },
                    ]}
                  />
                </Field>
                <Field label="Currency">
                  <Select name="currency" options={["INR", "USD"]} />
                </Field>
                <Field label="Opening balance" hint="Balance on the day you start using the app">
                  <Input name="openingBalance" inputMode="decimal" defaultValue="0" />
                </Field>
              </FormGrid>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
