"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OrderSource, OrderStatus, PaymentKind, ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canSeeMoney } from "@/lib/roles";
import { FormError, dateOf, formAction, numOf, req, reqNum, str } from "@/lib/form";
import { getUsdInrRate } from "@/lib/settings";

async function loadOrderFor(userId: string, role: string, orderId: string) {
  const order = await db.salesOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new FormError("Order not found.");
  if (role === "SALES" && order.salesExecId !== userId) throw new FormError("This is not your order.");
  return order;
}

/** Converts an amount in an account's currency to INR. */
async function toInr(accountId: string, amount: number, rate: number) {
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) throw new FormError("Choose an account.");
  return { account, rateToInr: account.currency === "INR" ? 1 : rate, amountInr: account.currency === "INR" ? amount : amount * rate };
}

export const createOrder = formAction(async (_prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);

  // Customer: existing or new
  let customerId = str(f, "customerId");
  if (!customerId) {
    const name = req(f, "customer.name", "Customer name");
    const c = await db.customer.create({
      data: {
        name,
        phone: str(f, "customer.phone"),
        whatsapp: str(f, "customer.whatsapp"),
        email: str(f, "customer.email"),
        country: str(f, "customer.country"),
        city: str(f, "customer.city"),
        address: str(f, "customer.address"),
        source: str(f, "customer.source"),
      },
    });
    customerId = c.id;
  }

  // Items arrive as item.name[], item.priceUsd[] etc.
  const names = f.getAll("item.name").map(String);
  const items = names
    .map((name, i) => ({
      name: name.trim(),
      category: String(f.getAll("item.category")[i] ?? "") || undefined,
      metal: String(f.getAll("item.metal")[i] ?? "") || undefined,
      stone: String(f.getAll("item.stone")[i] ?? "") || undefined,
      specs: String(f.getAll("item.specs")[i] ?? "") || undefined,
      quantity: Math.max(1, Number(f.getAll("item.quantity")[i] ?? 1) || 1),
      priceUsd: Number(String(f.getAll("item.priceUsd")[i] ?? "0").replaceAll(",", "")) || 0,
    }))
    .filter((i) => i.name);
  if (items.length === 0) throw new FormError("Add at least one item.");

  const totalUsd = items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);
  if (totalUsd <= 0) throw new FormError("Order value must be more than 0.");
  const rate = numOf(f, "usdInrRate") ?? (await getUsdInrRate());

  const salesExecId = user.role === "SALES" ? user.id : str(f, "salesExecId");

  const order = await db.salesOrder.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      customerId,
      salesExecId,
      source: (str(f, "source") as OrderSource) ?? "EMPLOYEE",
      websiteOrderId: str(f, "websiteOrderId"),
      status: (str(f, "status") as OrderStatus) ?? "CONFIRMED",
      totalUsd,
      usdInrRate: rate,
      priority: str(f, "priority"),
      requiredBy: dateOf(f, "requiredBy"),
      isGift: f.get("isGift") === "on",
      engraving: str(f, "engraving"),
      notes: str(f, "notes"),
      items: { create: items },
    },
  });

  // Optional first payment (deposit or full)
  const deposit = numOf(f, "deposit.amount");
  if (deposit && deposit > 0) {
    const accountId = req(f, "deposit.accountId", "Account for the payment");
    const conv = await toInr(accountId, deposit, rate);
    const confirmed = canSeeMoney(user.role);
    await db.paymentIn.create({
      data: {
        date: dateOf(f, "date") ?? new Date(),
        orderId: order.id,
        accountId,
        kind: deposit >= totalUsd ? "FULL" : "DEPOSIT",
        method: str(f, "deposit.method") ?? "Other",
        amount: deposit,
        rateToInr: conv.rateToInr,
        amountInr: conv.amountInr,
        confirmedById: confirmed ? user.id : null,
        confirmedAt: confirmed ? new Date() : null,
        createdById: user.id,
      },
    });
  }

  await audit(user.id, "create", "order", order.id, { totalUsd });
  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
});

export const updateOrderStatus = formAction(async (orderId: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES", "DISPATCH"]);
  await loadOrderFor(user.id, user.role, orderId);
  const status = req(f, "status") as OrderStatus;
  await db.salesOrder.update({ where: { id: orderId }, data: { status } });
  await audit(user.id, "status", "order", orderId, { status });
  revalidatePath(`/orders/${orderId}`);
});

export const addPayment = formAction(async (orderId: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "SALES"]);
  const order = await loadOrderFor(user.id, user.role, orderId);
  const amount = reqNum(f, "amount", "Amount");
  if (amount <= 0) throw new FormError("Amount must be more than 0.");
  const accountId = req(f, "accountId", "Account");
  const rate = numOf(f, "rate") ?? Number(order.usdInrRate);
  const conv = await toInr(accountId, amount, rate);
  const confirmed = canSeeMoney(user.role);
  await db.paymentIn.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      orderId,
      accountId,
      kind: (str(f, "kind") as PaymentKind) ?? "BALANCE",
      method: str(f, "method") ?? "Other",
      amount,
      rateToInr: conv.rateToInr,
      amountInr: conv.amountInr,
      notes: str(f, "notes"),
      confirmedById: confirmed ? user.id : null,
      confirmedAt: confirmed ? new Date() : null,
      createdById: user.id,
    },
  });
  await audit(user.id, "create", "paymentIn", orderId, { amount, accountId });
  revalidatePath(`/orders/${orderId}`);
});

export const addPurchase = formAction(async (orderId: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS"]);
  const p = await db.purchase.create({
    data: {
      date: dateOf(f, "date") ?? new Date(),
      orderId,
      supplierId: req(f, "supplierId", "Supplier"),
      description: req(f, "description", "Description"),
      billNo: str(f, "billNo"),
      amountInr: reqNum(f, "amountInr", "Amount"),
      notes: str(f, "notes"),
    },
  });
  await audit(user.id, "create", "purchase", p.id);
  revalidatePath(`/orders/${orderId}`);
});

export const addShipment = formAction(async (orderId: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "DISPATCH"]);
  const courier = req(f, "courier", "Courier");
  const supplier = await db.supplier.findFirst({ where: { name: { equals: courier, mode: "insensitive" } } });
  const status = (str(f, "status") as ShipmentStatus) ?? "DISPATCHED";
  const s = await db.shipment.create({
    data: {
      orderId,
      courier,
      supplierId: supplier?.id,
      trackingNo: str(f, "trackingNo"),
      dispatchDate: dateOf(f, "dispatchDate") ?? new Date(),
      status,
      trackingSent: f.get("trackingSent") === "on",
      costInr: user.role === "DISPATCH" ? 0 : (numOf(f, "costInr") ?? 0),
      notes: str(f, "notes"),
    },
  });
  await db.salesOrder.update({ where: { id: orderId }, data: { status: status === "DELIVERED" ? "DELIVERED" : "DISPATCHED" } });
  await audit(user.id, "create", "shipment", s.id);
  revalidatePath(`/orders/${orderId}`);
});

export const updateShipment = formAction(async (shipmentId: string, _prev: string | undefined, f: FormData) => {
  const user = await requireUser(["OWNER", "ACCOUNTS", "DISPATCH"]);
  const status = req(f, "status") as ShipmentStatus;
  const s = await db.shipment.update({
    where: { id: shipmentId },
    data: { status, trackingSent: f.get("trackingSent") === "on" },
  });
  if (status === "DELIVERED") await db.salesOrder.update({ where: { id: s.orderId }, data: { status: "DELIVERED" } });
  await audit(user.id, "update", "shipment", shipmentId, { status });
  revalidatePath(`/orders/${s.orderId}`);
});
