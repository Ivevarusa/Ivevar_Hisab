import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { supplierBalances } from "@/lib/finance";
import { inr, label } from "@/lib/format";
import { Card, Field, FormGrid, Input, PageHeader, Select, Table, Td, Textarea } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { createSupplier } from "../money/actions";

export default async function SuppliersPage() {
  await requireUser(["OWNER", "ACCOUNTS"]);
  const suppliers = await supplierBalances();
  const totalOwed = suppliers.reduce((s, x) => s + Math.max(0, x.owedInr), 0);
  return (
    <>
      <PageHeader title="Suppliers" subtitle={`We owe ${inr(totalOwed)} in total`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Table head={["Name", "Type", "Billed", "Paid", "We owe"]} empty="No suppliers yet.">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/suppliers/${s.id}`} className="font-medium text-indigo-700">
                    {s.name}
                  </Link>
                </Td>
                <Td>{label(s.type)}</Td>
                <Td>{inr(s.billedInr)}</Td>
                <Td>{inr(s.paidInr)}</Td>
                <Td className={s.owedInr > 0 ? "font-medium text-rose-700" : "text-slate-500"}>{inr(s.owedInr)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Add supplier">
          <ActionForm action={createSupplier} submit="Add supplier">
            <Field label="Name">
              <Input name="name" required placeholder="Manufacturer, courier or vendor" />
            </Field>
            <Field label="Type">
              <Select
                name="type"
                options={[
                  { value: "MANUFACTURER", label: "Manufacturer" },
                  { value: "COURIER", label: "Courier" },
                  { value: "VENDOR", label: "Other vendor" },
                ]}
              />
            </Field>
            <FormGrid>
              <Field label="Phone">
                <Input name="phone" />
              </Field>
              <Field label="GST no.">
                <Input name="gstNo" />
              </Field>
            </FormGrid>
            <Field label="Bank details">
              <Textarea name="bankInfo" />
            </Field>
          </ActionForm>
          <p className="mt-3 text-xs text-slate-500">Name a courier supplier exactly like the courier (UPS, FedEx) so shipping costs are added to what we owe them.</p>
        </Card>
      </div>
    </>
  );
}
