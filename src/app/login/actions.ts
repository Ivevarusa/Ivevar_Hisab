"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

export async function login(_prev: string | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return "Wrong email or password.";
  }
  await createSession({ id: user.id, name: user.name, role: user.role });
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
