import { redirect } from "next/navigation";
import { setupState } from "@/lib/setup-state";
import { NoDatabase } from "@/components/no-db";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const state = await setupState();
  if (state === "no-db") return <NoDatabase />;
  if (state === "no-owner") redirect("/setup");
  return <LoginForm />;
}
