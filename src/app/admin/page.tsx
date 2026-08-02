import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { adminDashboard } from "@/server/admin-service";
import SubscriptionButton from "@/components/admin/SubscriptionButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/studio");
  const data = await adminDashboard(String(user._id));
  return <div className="admin-shell">
    <header className="topbar"><div><div className="crumb">Fidely administration</div><h1>Merchant dashboard</h1><div className="subt">Manage stores, 7-day trials, and the single 49 DT/month subscription.</div></div>
      <form action="/api/logout" method="post"><button className="btn btn-secondary">Sign out</button></form>
    </header>
    <main className="content">
      <section className="kpi-row">{[
        ["Merchants", data.totals.merchants], ["Active subscriptions", data.totals.active],
        ["Free trials", data.totals.trialing], ["Pending payment", data.totals.pending], ["Connected stores", data.totals.connected],
      ].map(([label, value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      <section className="panel block"><div className="p-head"><div><h3>All merchants</h3><div className="sub">Subscription, connection, and usage overview.</div></div></div>
        {data.merchants.length ? <div className="table-scroll"><table className="dense"><thead><tr><th>Merchant</th><th>Subscription</th><th>Store health</th><th>Customers and segments</th><th>Orders and financials</th><th>Campaigns</th><th>Action</th></tr></thead>
          <tbody>{data.merchants.map((merchant) => <tr key={merchant.id}><td><b>{merchant.shopName}</b><div className="muted">{merchant.email}</div></td>
            <td><b>{merchant.subscription?.status || "Not created"}</b><div className="muted">{merchant.subscription?.currentPeriodEndsAt ? `Until ${new Date(merchant.subscription.currentPeriodEndsAt).toLocaleDateString()}` : "49 DT / month"}</div></td>
            <td>{merchant.store ? <span className={merchant.store.healthy ? "positive" : "muted"}>{merchant.store.healthy ? "Healthy" : "Needs attention"}</span> : "Not connected"}</td>
            <td><b>{merchant.customers} customers</b><div className="muted">VIP {merchant.segments.vip} · At risk {merchant.segments.atRisk} · Dormant {merchant.segments.dormant}</div><div className="muted">High basket {merchant.segments.highBasket} · Close to reward {merchant.segments.closeReward}</div><div className="muted">Loyalty {merchant.loyaltyMembers} · {merchant.pointsOutstanding} points · {merchant.activeRewards} rewards</div></td>
            <td><b>{merchant.orders} orders · {merchant.deliveredOrders} delivered</b><div className="muted">Revenue {merchant.revenue} TND · Cost {merchant.cost} TND</div></td>
            <td><b>{merchant.campaigns} total</b><div className="muted">{merchant.campaignsLaunched} launched · {merchant.campaignDrafts} drafts</div></td>
            <td><SubscriptionButton merchantId={merchant.id} active={merchant.subscription?.status === "active"} /></td></tr>)}</tbody></table></div>
          : <div className="empty-state"><h3>No merchants yet</h3><p>Merchant accounts will appear after registration.</p></div>}
      </section>
    </main>
  </div>;
}
