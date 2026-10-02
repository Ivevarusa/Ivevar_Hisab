"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Creates the very first owner login. Works only while no owner exists. */
export async function createOwner(_prev: string | undefined, f: FormData): Promise<string | undefined> {
  const name = String(f.get("name") ?? "").trim();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const password = String(f.get("password") ?? "");
  if (!name || !email) return "Name and email are required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== String(f.get("confirm") ?? "")) return "The two passwords do not match.";

  const user = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242)`; // two people submitting at once cannot both become owner
    if ((await tx.user.count({ where: { role: "OWNER" } })) > 0) return null;
    const existing = await tx.user.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);
    return existing
      ? tx.user.update({ where: { id: existing.id }, data: { name, role: "OWNER", active: true, passwordHash } })
      : tx.user.create({ data: { name, email, role: "OWNER", passwordHash } });
  });
  if (!user) redirect("/login");

  await audit(user.id, "create", "owner", user.id);
  await createSession({ id: user.id, name: user.name, role: user.role });
  redirect("/");
}
