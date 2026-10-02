/**
 * One-time import of the "IVEVAR Master Sales & Profit Dashboard" sheet (Shipping Updates tab).
 *
 * Used by Settings > Import old Excel, and by `npm run import:excel -- <file.xlsx>`.
 *
 * For each row it creates: the customer (matched by email, then phone, then name), the sales executive
 * (as a team member who cannot sign in until the owner sets a password), the order and its item, the
 * full payment, the making cost as a purchase from "Manufacturer (from Excel)", and the shipment with
 * its courier cost.
 *
 * Old money did not pass through the new cash and bank accounts, so imported payments in and out go
 * through one account called "Excel history". Real accounts start clean with their opening balances.
 * Running it twice skips rows that were already imported (matched by the sheet's Timestamp column).
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import * as XLSX from "xlsx";
import type { OrderSource, PrismaClient, ShipmentStatus } from "@prisma/client";

// Strip emojis and extra spaces from headers and values, e.g. "👤 Customer Full Name " -> "Customer Full Name"
const clean = (v: unknown) =>
  String(v ?? "")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}$+#@&/()%.,-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const toDate = (v: unknown) => {
  if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  if (typeof v === "number") return new Date(Date.UTC(1899, 11, 30) + v * 864e5);
  const d = new Date(String(v));
  return isNaN(+d) ? undefined : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};
const toNum = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const METHOD_ACCOUNT: Record<string, string> = {
  "Stripe Payment Link": "Stripe payment link",
  "Shopify Website": "Shopify website",
  Zelle: "Zelle",
  PayPal: "PayPal",
  "Bank Transfer": "Bank transfer",
  Crypto: "Crypto",
};

const SHIP_STATUS: Record<string, ShipmentStatus> = { Delivered: "DELIVERED", Dispatched: "DISPATCHED", "In Transit": "IN_TRANSIT" };

async function userByName(db: PrismaClient, name: string) {
  const existing = await db.user.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (existing) return existing;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  return db.user.create({
    data: {
      name,
      email: `${slug}@staff.ivevar.local`,
      role: "SALES",
      active: false, // owner sets a real email and password in Settings
      passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10),
    },
  });
}

async function supplier(db: PrismaClient, name: string, type: "MANUFACTURER" | "COURIER") {
  return db.supplier.upsert({ where: { name }, update: {}, create: { name, type } });
}

/** Imports the "Shipping Updates" tab of the old Excel sheet. Safe to run twice. */
export async function importWorkbook(db: PrismaClient, data: Buffer) {
  const wb = XLSX.read(data, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames.find((n) => clean(n).includes("Shipping Updates"));
  if (!sheetName) throw new Error("No 'Shipping Updates' tab found");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
  const rows = raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [clean(k), v])));

  const history = await db.account.upsert({
    where: { name: "Excel history" },
    update: {},
    create: { name: "Excel history", type: "WALLET", currency: "INR", active: false },
  });
  const maker = await supplier(db, "Manufacturer (from Excel)", "MANUFACTURER");

  let imported = 0;
  let skipped = 0;
  for (const r of rows) {
    const name = clean(r["Customer Full Name"]) || [clean(r["First Name"]), clean(r["Last Name"])].filter(Boolean).join(" ");
    const totalUsd = toNum(r["Order Value ( USD )"]);
    if (!name || !totalUsd) continue;
    const tracking = clean(r["Tracking Number"]).replace(/\s+/g, "");
    const stamp = r["Timestamp"] instanceof Date ? (r["Timestamp"] as Date).toISOString() : clean(r["Timestamp"]);
    const importRef = `excel:${stamp}:${tracking}:${name}:${totalUsd}`;
    if (await db.salesOrder.findUnique({ where: { importRef } })) {
      skipped++;
      continue;
    }

    const email = clean(r["Email Address"]).toLowerCase() || undefined;
    const phone = clean(r["Phone Number"]) || undefined;
    let customer =
      (email && (await db.customer.findFirst({ where: { email } }))) ||
      (phone && (await db.customer.findFirst({ where: { phone } }))) ||
      (await db.customer.findFirst({ where: { name: { equals: name, mode: "insensitive" } } }));
    if (!customer) {
      customer = await db.customer.create({
        data: {
          name: [clean(r["First Name"]), clean(r["Last Name"])].filter(Boolean).join(" ") || name,
          email,
          phone,
          city: clean(r["City"]) || undefined,
          state: clean(r["State"]) || undefined,
          zip: clean(r["Postal/ZIP Code"]) || undefined,
          country: clean(r["Country"]) || undefined,
          birthday: toDate(r["Customer DOB"]),
          gender: clean(r["Gender"]) || undefined,
        },
      });
    }

    const execName = clean(r["Sales Executive Name"]);
    const exec = execName ? await userByName(db, execName) : null;
    const confirmerName = clean(r["Payment Confirmed By"]);
    const confirmer = confirmerName ? await userByName(db, confirmerName) : null;

    const rate = toNum(r["USD to INR Rate"]) || 88;
    const dispatch = toDate(r["Dispatch Date"]) ?? toDate(r["Timestamp"]) ?? new Date();
    const shipStatus = SHIP_STATUS[clean(r["Shipping Status"])] ?? "DISPATCHED";
    const sourceText = clean(r["Order Source"]).toLowerCase();
    const source: OrderSource = sourceText.includes("website") ? "WEBSITE" : sourceText.includes("etsy") ? "ETSY" : "EMPLOYEE";
    const making = toNum(r["Total Making Cost (INR)"]);
    const courierCost = toNum(r["Courier Expense (INR)"]);
    const courierName = clean(r["Courier Company"]) || "Other";
    const courier = await supplier(db, courierName, "COURIER");
    const method = METHOD_ACCOUNT[clean(r["Payment Method"])] ?? (clean(r["Payment Method"]) || "Other");
    const websiteId = clean(r["Website Order ID"]);

    const order = await db.salesOrder.create({
      data: {
        date: dispatch,
        customerId: customer.id,
        salesExecId: exec?.id,
        source,
        websiteOrderId: websiteId && !/^\d+(\.\d+)?$/.test(websiteId) ? websiteId : undefined,
        status: shipStatus === "DELIVERED" ? "DELIVERED" : "DISPATCHED",
        importRef,
        totalUsd,
        usdInrRate: rate,
        notes: [clean(r["Shipping Notes"]), clean(r["Customer Number"]) && `Customer no. ${clean(r["Customer Number"])}`, clean(r["Product Image"])]
          .filter(Boolean)
          .join(" · ") || undefined,
        items: {
          create: [
            {
              name: clean(r["Products Details"]) || "Imported item",
              metal: clean(r["Metal & Diamond details"]) || undefined,
              quantity: 1,
              priceUsd: totalUsd,
            },
          ],
        },
        payments: {
          create: [
            {
              date: dispatch,
              accountId: history.id,
              kind: "FULL",
              method,
              amount: totalUsd * rate,
              rateToInr: 1,
              amountInr: totalUsd * rate,
              confirmedById: confirmer?.id,
              confirmedAt: confirmer ? dispatch : undefined,
              notes: "Imported from Excel",
            },
          ],
        },
        shipments: {
          create: [
            {
              courier: courierName,
              supplierId: courier.id,
              trackingNo: tracking || undefined,
              dispatchDate: dispatch,
              status: shipStatus,
              trackingSent: clean(r["Tracking Sent to Customer?"]).toLowerCase().startsWith("yes"),
              costInr: courierCost,
            },
          ],
        },
      },
    });

    if (making > 0) {
      await db.purchase.create({
        data: { date: dispatch, supplierId: maker.id, orderId: order.id, description: "Making cost (from Excel)", amountInr: making },
      });
      await db.paymentOut.create({
        data: { date: dispatch, supplierId: maker.id, accountId: history.id, amount: making, amountInr: making, notes: `Order #${order.orderNo}, settled before the app` },
      });
    }
    if (courierCost > 0) {
      await db.paymentOut.create({
        data: { date: dispatch, supplierId: courier.id, accountId: history.id, amount: courierCost, amountInr: courierCost, notes: `Order #${order.orderNo}, settled before the app` },
      });
    }
    imported++;
  }
  return { imported, skipped };
}
