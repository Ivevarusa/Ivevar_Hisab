# IVEVAR Books

One app for IVEVAR's orders, payments, purchases, expenses and cash. It runs in the browser on PC and installs on Android and iPhone ("Add to Home Screen").

Phase 1 covers:

- **Orders**: customer, items, USD price, deposit, status, balance due, profit per order
- **Payments in**: deposits, balances and refunds into any account; sales staff entries wait for owner/accounts confirmation
- **Purchases and suppliers**: making cost per order, supplier bills, payments to suppliers, what we still owe
- **Shipping**: courier, tracking, status, courier cost (owed to the courier as a supplier)
- **Expenses**: by category, paid from an account, optionally linked to an employee (marketing spend)
- **Cash & Bank**: every account (cash, bank, Stripe, PayPal, Zelle, crypto), transfers, a cash book with running balance
- **Dashboard**: monthly sales, gross and net profit, money received, receivables, payables, cash, profit by sales executive
- **Team and roles**: Owner, Accounts, Sales executive, Dispatch, Marketing. Every change is written to an audit log.

Balances and profit are always calculated from the records, never typed in.

## Tech

Next.js 15 (App Router, server actions) · PostgreSQL via Prisma · Tailwind CSS · cookie sessions (jose) · installable PWA.

## Put it online (Supabase + Vercel, no commands needed)

1. Create a free project at supabase.com. Copy the database connection string (Connect > Session pooler) and put the database password into it.
2. Import this GitHub repository at vercel.com.
3. In Vercel, add the environment variables `DATABASE_URL`, `AUTH_SECRET` (32+ random characters), `OWNER_EMAIL` and `OWNER_PASSWORD`, then deploy.
4. Every deploy creates or updates the tables and adds the owner login, default accounts and the USD→INR rate if they are missing (`npm run build` runs `prisma migrate deploy` and `prisma/seed.ts`).
5. Sign in as the owner and upload the old Excel file in Settings > Import old Excel.

## Run it on a computer

Needs Node.js 20+ and a PostgreSQL database.

```bash
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, OWNER_EMAIL, OWNER_PASSWORD
npm install
npm run db:migrate && npm run db:seed
npm run dev                 # http://localhost:3000
```

## About the Excel import

Settings > Import old Excel (or `npm run import:excel -- <file.xlsx>`) reads the "Shipping Updates" tab: customers, sales executives, orders, full payments, making cost and courier cost. Money from before the app goes through a closed account called "Excel history", so real accounts start clean with their opening balances. Imported sales executives cannot sign in until the owner gives them an email and password in Settings. Running the import again skips rows already imported.
