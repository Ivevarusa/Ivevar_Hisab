"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { dateOf, formAction, req, str } from "@/lib/form";

function customerData(f: FormData) {
  return {
    name: req(f, "name", "Name"),
    phone: str(f, "phone") ?? null,
    whatsapp: str(f, "whatsapp") ?? null,
    email: str(f, "email") ?? null,
    address: str(f, "address") ?? null,
    city: str(f, "city") ?? null,
    state: str(f, "state") ?? null,
    zip: str(f, "zip") ?? null,
    country: str(f, "country") ?? null,
    birthday: dateOf(f, "birthday") ?? null,
    gender: str(f, "gender") ?? null,
    source: str(f, "source") ?? null,
    notes: str(f, "notes") ?? null,
  };
}

export const createCustomer = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const c = await db.customer.create({ data: customerData(f) });
  await audit(user.id, "create", "customer", c.id);
  redirect(`/customers/${c.id}`);
});

export const updateCustomer = formAction(async (id: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  await db.customer.update({ where: { id }, data: customerData(f) });
  await audit(user.id, "update", "customer", id);
  revalidatePath(`/customers/${id}`);
});
