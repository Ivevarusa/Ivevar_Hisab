import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { CustomerFields } from "../fields";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  return (
    <>
      <PageHeader title="New customer" />
      <Card>
        <ActionForm action={createCustomer} submit="Save customer">
          <CustomerFields />
        </ActionForm>
      </Card>
    </>
  );
}
