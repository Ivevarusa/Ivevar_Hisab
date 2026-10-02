import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getUsdInrRate } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { NewOrderForm } from "./form";

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const { customer } = await searchParams;
  const [customers, execs, accounts, rate] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, country: true } }),
    db.user.findMany({ where: { active: true, role: { in: ["SALES", "OWNER", "ACCOUNTS"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.account.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, currency: true } }),
    getUsdInrRate(),
  ]);
  return (
    <>
      <PageHeader title="New order" />
      <NewOrderForm
        customers={customers}
        execs={execs}
        accounts={accounts}
        rate={rate}
        isSales={user.role === "SALES"}
        currentUserId={user.id}
        presetCustomerId={customer}
      />
    </>
  );
}
