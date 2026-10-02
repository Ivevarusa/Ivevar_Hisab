/**
 * First-time setup: the owner login, the money accounts and the exchange rate.
 * Run with: npm run db:seed   (safe to run again; it only adds what is missing)
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient, type AccountType } from "@prisma/client";

const db = new PrismaClient();

const ACCOUNTS: { name: string; type: AccountType; currency: string }[] = [
  { name: "Cash", type: "CASH", currency: "INR" },
  { name: "Bank", type: "BANK", currency: "INR" },
  { name: "Stripe", type: "GATEWAY", currency: "USD" },
  { name: "Shopify Payments", type: "GATEWAY", currency: "USD" },
  { name: "PayPal", type: "GATEWAY", currency: "USD" },
  { name: "Zelle", type: "WALLET", currency: "USD" },
  { name: "Crypto", type: "WALLET", currency: "USD" },
];

async function main() {
  const email = (process.env.OWNER_EMAIL ?? "owner@ivevar.com").toLowerCase();
  if (!(await db.user.findUnique({ where: { email } }))) {
    const password = process.env.OWNER_PASSWORD ?? randomBytes(6).toString("base64url");
    await db.user.create({
      data: { name: process.env.OWNER_NAME ?? "Owner", email, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Owner login created: ${email} / ${password}  (change it in Settings)`);
  }

  for (const a of ACCOUNTS) {
    await db.account.upsert({ where: { name: a.name }, update: {}, create: a });
  }
  await db.setting.upsert({ where: { key: "usdInrRate" }, update: {}, create: { key: "usdInrRate", value: "88" } });
  console.log("Accounts and exchange rate ready.");
}

main().finally(() => db.$disconnect());
