"use server";

import { revalidatePath } from "next/cache";
import type { AccountType, SupplierType } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { FormError, dateOf, formAction, numOf, req, reqNum, str } from "@/lib/form";
import { getUsdInrRate } from "@/lib/settings";

const MONEY = ["OWNER", "ACCOUNTS"] as const;

async function conv(accountId: string, amount: number, f: FormData) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) throw new FormError("Choose an account.");
  const rate = account.currency === "INR" ? 1 : (numOf(f, "rate") ?? (await getUsdInrRate()));
  return { rateToInr: rate, amountInr: amount * rate };
}

export async function confirmPayment(paymentId: string) {
  const user = await requireUser([...MONEY]);
  await db.paymentIn.update({ where: { id: paymentId }, data: { confirmedById: user.id, confirmedAt: new Date() } });
  await audit(user.id, "confirm", "paymentIn", paymentId);
  revalidatePath("/payments");
  revalidatePath("/");
}

export async function deletePayment(paymentId: string) {
  const user = await requireUser(["OWNER"]);
  const p = await db.paymentIn.delete({ where: { id: paymentId } });
  await audit(user.id, "delete", "paymentIn", paymentId, p);
  revalidatePath("/payments");
}

export const createSupplier = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser([...MONEY]);
  const name = req(f, "name", "Name");
  if (await db.supplier.findUnique({ where: { name } })) throw new FormError("A supplier with this name already exists.");
  const s = await db.supplier.create({
    data: {
      name,
      type: (str(f, "type") as SupplierType) ?? "MANUFACTURER",
      phone: str(f, "phone"),
      gstNo: str(f, "gstNo"),
      bankInfo: str(f, "bankInfo"),
      notes: str(f, "notes"),
    },
  });
  await audit(user.id, "create", "supplier", s.id);
  revalidatePath("/suppliers");
});

export const createPurchase = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser([...MONEY]);
  let orderId: string | undefined;
  const orderNo = numOf(f, "orderNo");
  if (orderNo) {
    const o = await db.salesOrder.findUnique({ where: { orderNo } });
    if (!o) throw new FormError(`Order #${orderNo} not found.`);
    orderId = o.id;
  }
  const p = await db.purchase.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      supplierId: req(f, "supplierId", "Supplier"),
      orderId,
      description: req(f, "description", "Description"),
      billNo: str(f, "billNo"),
      amountInr: reqNum(f, "amountInr", "Amount"),
      notes: str(f, "notes"),
    },
  });
  await audit(user.id, "create", "purchase", p.id);
  revalidatePath("/purchases");
});

export const createSupplierPayment = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser([...MONEY]);
  const amount = reqNum(f, "amount", "Amount");
  if (amount <= 0) throw new FormError("Amount must be more than 0.");
  const accountId = req(f, "accountId", "Account");
  const supplierId = req(f, "supplierId", "Supplier");
  const p = await db.paymentOut.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      supplierId,
      accountId,
      method: str(f, "method"),
      amount,
      ...(await conv(accountId, amount, f)),
      notes: str(f, "notes"),
    },
  });
  await audit(user.id, "create", "paymentOut", p.id);
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
});

export const createExpense = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser([...MONEY]);
  const amount = reqNum(f, "amount", "Amount");
  if (amount <= 0) throw new FormError("Amount must be more than 0.");
  const accountId = req(f, "accountId", "Paid from");
  const e = await db.expense.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      category: req(f, "category", "Category"),
      description: req(f, "description", "Description"),
      paidTo: str(f, "paidTo"),
      accountId,
      amount,
      ...(await conv(accountId, amount, f)),
      employeeId: str(f, "employeeId"),
    },
  });
  await audit(user.id, "create", "expense", e.id);
  revalidatePath("/expenses");
});

export async function deleteExpense(id: string) {
  const user = await requireUser(["OWNER"]);
  const e = await db.expense.delete({ where: { id } });
  await audit(user.id, "delete", "expense", id, e);
  revalidatePath("/expenses");
}

export const createAccount = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER"]);
  const name = req(f, "name", "Name");
  if (await db.account.findUnique({ where: { name } })) throw new FormError("An account with this name already exists.");
  const a = await db.account.create({
    data: {
      name,
      type: (str(f, "type") as AccountType) ?? "BANK",
      currency: str(f, "currency") ?? "INR",
      openingBalance: numOf(f, "openingBalance") ?? 0,
    },
  });
  await audit(user.id, "create", "account", a.id);
  revalidatePath("/accounts");
});

export const createTransfer = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser([...MONEY]);
  const fromAccountId = req(f, "fromAccountId", "From account");
  const toAccountId = req(f, "toAccountId", "To account");
  if (fromAccountId === toAccountId) throw new FormError("Choose two different accounts.");
  const amountFrom = reqNum(f, "amountFrom", "Amount sent");
  const amountTo = numOf(f, "amountTo") ?? amountFrom;
  const t = await db.transfer.create({
    data: { date: dateOf(f, "date") ?? new Date(), fromAccountId, toAccountId, amountFrom, amountTo, notes: str(f, "notes") },
  });
  await audit(user.id, "create", "transfer", t.id);
  revalidatePath("/accounts");
});

export const updateAccount = formAction(async (id: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER"]);
  const name = req(f, "name", "Name");
  const clash = await db.account.findUnique({ where: { name } });
  if (clash && clash.id !== id) throw new FormError("An account with this name already exists.");
  await db.account.update({
    where: { id },
    data: { name, openingBalance: numOf(f, "openingBalance") ?? 0, active: f.get("active") === "on" },
  });
  await audit(user.id, "update", "account", id);
  revalidatePath(`/accounts/${id}`);
  revalidatePath("/accounts");
});
