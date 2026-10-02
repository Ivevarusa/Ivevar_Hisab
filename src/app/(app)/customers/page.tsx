import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ButtonLink, Card, PageHeader, Table, Td } from "@/components/ui";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const { q } = await searchParams;
  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { whatsapp: { contains: q } },
          ],
        }
      : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: { name: "asc" },
    take: 500,
  });
  return (
    <>
      <PageHeader title="Customers" subtitle={`${customers.length} customers`} action={<ButtonLink href="/customers/new">+ New customer</ButtonLink>} />
      <Card>
        <form className="mb-4 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Search</button>
        </form>
        <Table head={["Name", "Country", "WhatsApp / phone", "Email", "Orders"]} empty="No customers found.">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/customers/${c.id}`} className="font-medium text-indigo-700">
                  {c.name}
                </Link>
              </Td>
              <Td>{c.country}</Td>
              <Td>{c.whatsapp ?? c.phone}</Td>
              <Td>{c.email}</Td>
              <Td>{c._count.orders}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
