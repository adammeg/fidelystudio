import DashboardShell from "@/components/DashboardShell";
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
  const access = effectiveSubscription(subscription.status, subscription.trialEndsAt, subscription.currentPeriodEndsAt);
  if (access === "restricted") redirect("/payment");
  const converty = await getConvertyStatus().catch(() => null);
  const name = user.shopName || user.email || "Fidely store";
  const platform =
    converty?.connected && converty.store?.name
      ? converty.store.name
      : "Converty not connected";

  return <DashboardShell
    shop={{ name, platform, initial: name.charAt(0).toUpperCase() }}
    trial={access === "trialing" ? { endsAt: new Date(subscription.trialEndsAt).toISOString() } : undefined}
  >{children}</DashboardShell>;
}
