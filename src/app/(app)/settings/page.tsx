import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getUsdInrRate } from "@/lib/settings";
import { ROLE_LABEL } from "@/lib/roles";
import { Badge, Card, Field, FormGrid, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { ImportForm } from "@/components/import-form";
import { createUser, importExcel, saveRate, updateUser } from "./actions";

const ROLE_OPTS = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }));

export default async function SettingsPage() {
  await requireUser(["OWNER"]);
  const [rate, users] = await Promise.all([getUsdInrRate(), db.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] })]);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="USD to INR rate">
            <ActionForm action={saveRate} submit="Save rate" resetOnSuccess={false}>
              <Field label="Rate used for new orders and payments">
                <Input name="usdInrRate" inputMode="decimal" defaultValue={rate} />
              </Field>
            </ActionForm>
          </Card>
          <Card title="Import old Excel">
            <p className="mb-3 text-sm text-slate-600">Upload the &quot;Master Sales &amp; Profit Dashboard&quot; file (.xlsx). Orders from its Shipping Updates tab are added once; uploading again skips them.</p>
            <ImportForm action={importExcel} />
          </Card>
          <Card title="Add team member">
            <ActionForm action={createUser} submit="Add member">
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <Field label="Email (used to sign in)">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Password" hint="At least 8 characters. Share it with them privately.">
                <Input name="password" type="text" required minLength={8} />
              </Field>
              <FormGrid>
                <Field label="Role">
                  <Select name="role" defaultValue="SALES" options={ROLE_OPTS} />
                </Field>
                <Field label="Profit share %">
                  <Input name="commissionPct" inputMode="decimal" defaultValue="25" />
                </Field>
              </FormGrid>
            </ActionForm>
          </Card>
        </div>
        <Card title={`Team (${users.filter((u) => u.active).length} active)`} className="lg:col-span-2">
          <div className="space-y-3">
            {users.map((u) => (
              <details key={u.id} className="rounded-lg border border-slate-200 p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-slate-500">{u.email}</span>
                  <Badge tone={u.role === "OWNER" ? "blue" : "slate"}>{ROLE_LABEL[u.role]}</Badge>
                  {!u.active && <Badge tone="red">Cannot sign in</Badge>}
                </summary>
                <ActionForm action={updateUser.bind(null, u.id)} submit="Save" resetOnSuccess={false} className="mt-3 space-y-3">
                  <FormGrid>
                    <Field label="Email">
                      <Input name="email" type="email" defaultValue={u.email} />
                    </Field>
                    <Field label="Role">
                      <Select name="role" defaultValue={u.role} options={ROLE_OPTS} />
                    </Field>
                    <Field label="Profit share %">
                      <Input name="commissionPct" inputMode="decimal" defaultValue={String(u.commissionPct)} />
                    </Field>
                    <Field label="New password" hint="Leave empty to keep the current one">
                      <Input name="password" type="text" minLength={8} />
                    </Field>
                  </FormGrid>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={u.active} /> Can sign in
                  </label>
                </ActionForm>
              </details>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
