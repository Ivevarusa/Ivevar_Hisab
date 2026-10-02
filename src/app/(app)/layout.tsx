import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { logout } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Nav role={user.role} name={user.name} logout={logout} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 lg:ml-56 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
    </div>
  );
}
