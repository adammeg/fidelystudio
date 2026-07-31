import Sidebar from "@/components/Sidebar";
import { getConvertyStatus } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, converty] = await Promise.all([
    getSessionUser(),
    getConvertyStatus().catch(() => null),
  ]);
  const name = user.shopName || user.email || "Fidely store";
  const platform =
    converty?.connected && converty.store?.name
      ? converty.store.name
      : "Converty not connected";

  return (
    <div className="app">
      <Sidebar
        shop={{
          name,
          platform,
          initial: name.charAt(0).toUpperCase(),
        }}
      />
      <main className="main">{children}</main>
    </div>
  );
}
