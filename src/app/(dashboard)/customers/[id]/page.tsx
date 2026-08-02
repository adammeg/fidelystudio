import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/studio";
import CustomerNotesForm from "@/components/studio/CustomerNotesForm";
import CustomerConsentForm from "@/components/studio/CustomerConsentForm";
import { fmt, initials, timeAgo } from "@/lib/format";

function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getCustomer(id);
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) notFound();
    throw error;
  }
  const { customer, stats, orders } = data;
  return <>
    <header className="topbar"><div>
      <div className="breadcrumb"><Link href="/customers">Customers</Link><span>/</span><span className="cur">{customer.name}</span></div>
      <h1>{customer.name}</h1><div className="subt">Order-backed customer profile</div>
    </div></header>
    <div className="content">
      <section className="profile-band">
        <span className="pav">{initials(customer.name)}</span>
        <div><div className="pname">{customer.name}</div><div className="pphone">{customer.phone}</div>
          <div className="pchips"><span className="acq-chip">First seen {date(customer.createdAt)}</span>{customer.email && <span className="acq-chip">{customer.email}</span>}</div>
        </div>
        <div className="pright"><div className="pl">Last delivered</div><div className="pv">{timeAgo(customer.lastDeliveredAt)}</div></div>
      </section>
      <section className="kpi-row block">
        {[
          ["Delivered revenue", `${fmt(stats.spent)} TND`],
          ["Orders placed", String(stats.placed)],
          ["Delivered", String(stats.delivered)],
          ["Refused / returned", String(stats.refused)],
          ["Delivery rate", `${stats.deliveryRate}%`],
        ].map(([label, value], index) => <article className={`kpi${index === 2 ? " feature" : ""}`} key={label}>
          <div className="k-label">{label}</div><div className="k-val">{value}</div>
        </article>)}
      </section>
      <div className="grid-12 block">
        <section className="panel span8">
          <div className="p-head"><div><h3>Order history</h3><div className="sub">Statuses and totals received from Converty</div></div></div>
          {orders.length ? <div className="table-scroll"><table>
            <thead><tr><th>Date</th><th>Reference</th><th>Status</th><th className="num">Amount</th></tr></thead>
            <tbody>{orders.map((order) => <tr key={order.id}>
              <td>{date(order.placedAt)}</td><td><b>{order.reference || "—"}</b></td>
              <td><span className={`status-pill status-${order.status}`}>{order.status}</span></td>
              <td className="num">{fmt(order.amount)} TND</td>
            </tr>)}</tbody>
          </table></div> : <div className="empty-state"><h3>No orders found</h3><p>This customer has no synced orders.</p></div>}
        </section>
        <aside className="span4" style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <section className="panel"><div className="p-head"><div><h3>Marketing consent</h3><div className="sub">Controls campaign eligibility</div></div></div>
            <CustomerConsentForm customerId={customer.id} initial={customer.marketingConsent} />
          </section>
          <section className="panel"><div className="p-head"><div><h3>Private note</h3><div className="sub">Visible only inside Fidely Studio</div></div></div>
            <CustomerNotesForm customerId={customer.id} initialNote={customer.note || ""} />
          </section>
        </aside>
      </div>
    </div>
  </>;
}
