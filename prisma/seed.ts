/**
 * First-time setup: the owner login, the money accounts and the exchange rate.
 * Runs on every deploy (see the build script) and with `npm run db:seed`. Safe to run again: it only adds what is missing.
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
  if (await db.user.count({ where: { role: "OWNER" } })) {
    // An owner already exists: never touch logins again.
  } else if (!process.env.OWNER_PASSWORD && process.env.VERCEL) {
    console.warn("OWNER_PASSWORD is not set, so no owner login was created. Add it in Vercel and redeploy.");
  } else {
    const password = process.env.OWNER_PASSWORD ?? randomBytes(6).toString("base64url");
    await db.user.create({
      data: { name: process.env.OWNER_NAME ?? "Owner", email, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Owner login created for ${email}` + (process.env.OWNER_PASSWORD ? "" : ` with password ${password}`));
  }

  for (const a of ACCOUNTS) {
    await db.account.upsert({ where: { name: a.name }, update: {}, create: a });
  }
  await db.setting.upsert({ where: { key: "usdInrRate" }, update: {}, create: { key: "usdInrRate", value: "88" } });
  console.log("Accounts and exchange rate ready.");
}

main().finally(() => db.$disconnect());
