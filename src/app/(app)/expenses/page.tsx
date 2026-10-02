import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { monthRange } from "@/lib/finance";
import { day, inr, isoDay, money } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { Card, Field, FormGrid, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createExpense, deleteExpense } from "../money/actions";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS"]);
  const { month } = await searchParams;
  const { start, end, key } = monthRange(month);
  const [expenses, accounts, staff] = await Promise.all([
    db.expense.findMany({ where: { date: { gte: start, lt: end } }, include: { account: true, employee: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.account.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const total = expenses.reduce((s, e) => s + Number(e.amountInr), 0);
  const byCat = Object.entries(
    expenses.reduce<Record<string, number>>((m, e) => ((m[e.category] = (m[e.category] ?? 0) + Number(e.amountInr)), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`${inr(total)} in ${new Date(start).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}`}
        action={
          <form className="flex gap-2">
            <input type="month" name="month" defaultValue={key} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Show</button>
          </form>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <Table head={["Date", "Category", "Description", "Paid from", "Amount", ""]} empty="No expenses this month.">
              {expenses.map((e) => (
                <tr key={e.id}>
                  <Td>{day(e.date)}</Td>
                  <Td>{e.category}</Td>
                  <Td className="whitespace-normal">
                    {e.description}
                    {e.paidTo && <span className="text-slate-500"> · {e.paidTo}</span>}
                    {e.employee && <span className="text-slate-500"> · for {e.employee.name}</span>}
                  </Td>
                  <Td>{e.account.name}</Td>
                  <Td>
                    {money(e.amount, e.account.currency)}
                    {e.account.currency !== "INR" && <div className="text-xs text-slate-500">{inr(e.amountInr)}</div>}
                  </Td>
                  <Td>
                    {user.role === "OWNER" && (
                      <form action={deleteExpense.bind(null, e.id)}>
                        <button className="text-xs text-rose-600">Delete</button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
          {byCat.length > 0 && (
            <Card title="By category">
              <div className="space-y-2">
                {byCat.map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm">
                      <span>{cat}</span>
                      <span className="font-medium">{inr(amt)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(amt / byCat[0][1]) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        <Card title="Add expense">
          <ActionForm action={createExpense} submit="Save expense">
            <FormGrid>
              <Field label="Date">
                <Input name="date" type="date" defaultValue={isoDay()} required />
              </Field>
              <Field label="Amount" hint="In the account's currency">
                <Input name="amount" inputMode="decimal" required />
              </Field>
            </FormGrid>
            <Field label="Category">
              <Select name="category" required options={EXPENSE_CATEGORIES} />
            </Field>
            <Field label="Description">
              <Input name="description" required />
            </Field>
            <Field label="Paid to">
              <Input name="paidTo" />
            </Field>
            <Field label="Paid from">
              <Select name="accountId" required placeholder="Choose…" options={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))} />
            </Field>
            <Field label="For employee" hint="For marketing spend that counts against their profit share">
              <Select name="employeeId" placeholder="—" options={staff.map((s) => ({ value: s.id, label: s.name }))} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
