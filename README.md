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

## Put it online (Vercel + Supabase, only clicks)

1. At vercel.com, import this GitHub repository and deploy. Without a database the app shows "Database is not connected yet".
2. In the Vercel project, open Storage, create a Supabase database and connect it to the project. This fills in `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` and `SUPABASE_JWT_SECRET` automatically.
3. Redeploy. The build (`scripts/vercel-build.mjs`) creates the tables, default accounts and exchange rate.
4. Open the app: the first visit shows a one-time page to create the owner login.
5. Upload the old Excel in Settings > Import old Excel.

`DATABASE_URL` and `AUTH_SECRET` can be set by hand instead, for any other PostgreSQL host.

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
