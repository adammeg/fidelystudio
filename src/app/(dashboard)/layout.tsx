import Sidebar from "@/components/Sidebar";
import { getConvertyStatus } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ensureSubscription } from "@/server/subscriptions";
import { effectiveSubscription } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (user.role === "admin") redirect("/admin");
  const subscription = await ensureSubscription(user.id);
  const access = effectiveSubscription(subscription.status, subscription.trialEndsAt);
  if (access === "restricted") redirect("/payment");
  const converty = await getConvertyStatus().catch(() => null);
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
      <main className="main">
        {access === "trialing" && <div style={{ margin: "12px 18px 0", padding: "11px 14px", borderRadius: 12, background: "#FFF4DA", color: "#77551A", fontSize: 13, fontWeight: 650 }}>Your 7-day free trial is active until {new Date(subscription.trialEndsAt).toLocaleDateString("en-GB")}. After the trial, the plan is 49 DT/month and payment activation is required.</div>}
        {children}
      </main>
    </div>
  );
}
