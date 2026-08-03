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
    <header className="topbar"><div><div className="crumb">Fidely administration</div><h1>Merchant dashboard</h1><div className="subt">Manage stores, 7-day trials, and the 49 TND/month subscription.</div></div>
      <form action="/api/logout" method="post"><button className="btn btn-secondary">Sign out</button></form>
    </header>
    <main className="content">
      <section className="kpi-row">{[
        ["Merchants", data.totals.merchants], ["Active subscriptions", data.totals.active],
        ["Free trials", data.totals.trialing], ["Pending payment", data.totals.pending],
        ["Monthly recurring revenue", `${data.totals.active * 49} TND`],
      ].map(([label, value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      <section className="panel block"><div className="p-head"><div><h3>All merchants</h3><div className="sub">Subscription, connection, and usage overview.</div></div></div>
        {data.merchants.length ? <>
          <div className="table-scroll admin-table"><table className="dense"><thead><tr><th>Merchant</th><th>Plan</th><th>Connection</th><th className="num">Customers</th><th className="num">Revenue</th><th className="num">Campaigns</th><th>Period ends</th><th>Action</th></tr></thead>
            <tbody>{data.merchants.map((merchant) => <tr key={merchant.id}>
              <td><b>{merchant.shopName}</b><div className="muted">{merchant.email}</div></td>
              <td><span className={`status-pill ${merchant.subscription?.status === "active" ? "live" : ""}`}>{merchant.subscription?.status || "Not created"}</span><div className="muted">49 TND / month</div></td>
              <td>{merchant.store ? <span className={`status-pill ${merchant.store.healthy ? "live" : ""}`}>{merchant.store.healthy ? "Healthy" : "Needs attention"}</span> : <span className="status-pill">Not connected</span>}</td>
              <td className="num"><b>{merchant.customers}</b><div className="muted">{merchant.segments.vip} VIP · {merchant.segments.atRisk} at risk</div></td>
              <td className="num"><b>{merchant.revenue} TND</b><div className="muted">{merchant.deliveredOrders} delivered</div></td>
              <td className="num"><b>{merchant.campaigns}</b><div className="muted">{merchant.campaignsLaunched} sent · {merchant.campaignDrafts} drafts</div></td>
              <td>{merchant.subscription?.currentPeriodEndsAt ? new Date(merchant.subscription.currentPeriodEndsAt).toLocaleDateString("en-GB") : "—"}{merchant.lastPayment && <div className="muted">Ref. {merchant.lastPayment.reference}</div>}</td>
              <td><SubscriptionButton merchantId={merchant.id} active={merchant.subscription?.status === "active"} /></td>
            </tr>)}</tbody></table></div>
          <div className="admin-mobile-list">{data.merchants.map((merchant) => <article className="admin-merchant-card" key={merchant.id}>
            <div><h3>{merchant.shopName}</h3><p>{merchant.email}</p></div>
            <div className="admin-card-badges"><span className={`status-pill ${merchant.subscription?.status === "active" ? "live" : ""}`}>{merchant.subscription?.status || "No plan"}</span><span className={`status-pill ${merchant.store?.healthy ? "live" : ""}`}>{merchant.store?.healthy ? "Connected" : "Not connected"}</span></div>
            <dl><div><dt>Customers</dt><dd>{merchant.customers}</dd></div><div><dt>Revenue</dt><dd>{merchant.revenue} TND</dd></div><div><dt>Campaigns</dt><dd>{merchant.campaigns}</dd></div></dl>
            <SubscriptionButton merchantId={merchant.id} active={merchant.subscription?.status === "active"} />
          </article>)}</div>
        </> : <div className="empty-state"><h3>No merchants yet</h3><p>Merchant accounts will appear after registration.</p></div>}
      </section>
    </main>
  </div>;
}
