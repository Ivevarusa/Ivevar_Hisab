import { redirect } from "next/navigation";
import { setupState } from "@/lib/setup-state";
import { NoDatabase } from "@/components/no-db";
import { SetupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const state = await setupState();
  if (state === "no-db") return <NoDatabase />;
  if (state === "ready") redirect("/login");
  return <SetupForm />;
}
