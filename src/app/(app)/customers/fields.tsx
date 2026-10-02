import type { Customer } from "@prisma/client";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui";
import { isoDay } from "@/lib/format";

export function CustomerFields({ c }: { c?: Customer }) {
  return (
    <FormGrid>
      <Field label="Full name">
        <Input name="name" required defaultValue={c?.name} />
      </Field>
      <Field label="WhatsApp">
        <Input name="whatsapp" type="tel" defaultValue={c?.whatsapp ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={c?.phone ?? ""} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={c?.email ?? ""} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <Textarea name="address" defaultValue={c?.address ?? ""} />
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={c?.city ?? ""} />
      </Field>
      <Field label="State">
        <Input name="state" defaultValue={c?.state ?? ""} />
      </Field>
      <Field label="ZIP / postal code">
        <Input name="zip" defaultValue={c?.zip ?? ""} />
      </Field>
      <Field label="Country">
        <Input name="country" defaultValue={c?.country ?? ""} />
      </Field>
      <Field label="Birthday">
        <Input name="birthday" type="date" defaultValue={c?.birthday ? isoDay(c.birthday) : ""} />
      </Field>
      <Field label="Gender">
        <Select name="gender" defaultValue={c?.gender ?? ""} placeholder="—" options={["Male", "Female", "Other"]} />
      </Field>
      <Field label="Where did they find us?">
        <Input name="source" defaultValue={c?.source ?? ""} />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={c?.notes ?? ""} />
      </Field>
    </FormGrid>
  );
}
