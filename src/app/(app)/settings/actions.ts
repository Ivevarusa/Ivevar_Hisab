"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { FormError, formAction, numOf, req, reqNum, str } from "@/lib/form";

export const saveRate = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER"]);
  const rate = reqNum(f, "usdInrRate", "Rate");
  if (rate <= 0) throw new FormError("Rate must be more than 0.");
  await db.setting.upsert({ where: { key: "usdInrRate" }, update: { value: String(rate) }, create: { key: "usdInrRate", value: String(rate) } });
  await audit(user.id, "update", "setting", "usdInrRate", { rate });
  revalidatePath("/settings");
});

export const createUser = formAction(async (_prev: string | undefined, f: FormData) => {
  const owner = await requireUser(["OWNER"]);
  const email = req(f, "email", "Email").toLowerCase();
  const password = req(f, "password", "Password");
  if (password.length < 8) throw new FormError("Password must be at least 8 characters.");
  if (await db.user.findUnique({ where: { email } })) throw new FormError("This email is already used.");
  const u = await db.user.create({
    data: {
      name: req(f, "name", "Name"),
      email,
      phone: str(f, "phone"),
      role: (str(f, "role") as Role) ?? "SALES",
      commissionPct: numOf(f, "commissionPct") ?? 25,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  await audit(owner.id, "create", "user", u.id);
  revalidatePath("/settings");
});

export const updateUser = formAction(async (id: string, _prev: string | undefined, f: FormData) => {
  const owner = await requireUser(["OWNER"]);
  const password = str(f, "password");
  if (password && password.length < 8) throw new FormError("Password must be at least 8 characters.");
  const role = (str(f, "role") as Role) ?? "SALES";
  const active = f.get("active") === "on";
  if (id === owner.id && (role !== "OWNER" || !active)) throw new FormError("You cannot remove your own owner access.");
  const email = str(f, "email")?.toLowerCase();
  if (email) {
    const clash = await db.user.findUnique({ where: { email } });
    if (clash && clash.id !== id) throw new FormError("This email is already used.");
  }
  await db.user.update({
    where: { id },
    data: {
      role,
      active,
      ...(email ? { email } : {}),
      commissionPct: numOf(f, "commissionPct") ?? 25,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  await audit(owner.id, "update", "user", id, { role, active, passwordChanged: !!password });
  revalidatePath("/settings");
});
