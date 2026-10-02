// Build used on Vercel and by `npm run build`: sets up the database when one is connected, then builds the app.
import { execSync } from "node:child_process";

const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });

// Migrations need a direct (non-pooled) connection.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (url) {
  run("prisma migrate deploy", { DATABASE_URL: url });
  run("tsx prisma/seed.ts", { DATABASE_URL: url });
} else {
  console.warn("No database connected yet: skipping database setup. Connect Supabase in Vercel > Storage, then redeploy.");
}
run("next build");
