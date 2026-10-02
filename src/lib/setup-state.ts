import { db } from "./db";

/** "ready" once an owner exists, "no-owner" before the first sign-up, "no-db" when the database is not reachable. */
export async function setupState(): Promise<"ready" | "no-owner" | "no-db"> {
  try {
    return (await db.user.count({ where: { role: "OWNER" } })) > 0 ? "ready" : "no-owner";
  } catch (e) {
    console.error("Database check failed", e);
    return "no-db";
  }
}
