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
  const { customer, stats, orders, loyaltyTransactions } = data;
  const productPurchases = orders.flatMap((order) => order.products.map((product) => ({ ...product, orderId: order.id, reference: order.reference, status: order.status, placedAt: order.placedAt })));
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
      <section className="panel block">
        <div className="p-head"><div><h3>Points and rewards</h3><div className="sub">Complete audited loyalty activity</div></div><b>{fmt(customer.points)} points available</b></div>
        {loyaltyTransactions.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Activity</th><th>Type</th><th className="num">Points</th></tr></thead><tbody>{loyaltyTransactions.map((transaction) => <tr key={transaction.id}><td>{date(transaction.createdAt)}</td><td><b>{transaction.description}</b></td><td>{transaction.type}</td><td className="num" style={{ color: transaction.points >= 0 ? "var(--pos-fg)" : "#C2603C" }}>{transaction.points > 0 ? "+" : ""}{fmt(transaction.points)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p>No points activity yet.</p></div>}
      </section>
      <section className="panel block">
        <div className="p-head"><div><h3>Products purchased</h3><div className="sub">Items found in this customer&apos;s synced Converty order carts</div></div><b>{productPurchases.reduce((sum, product) => sum + product.quantity, 0)} items</b></div>
        {productPurchases.length ? <div className="table-scroll"><table className="dense"><thead><tr><th>Product</th><th>Variant</th><th>Order</th><th>Status</th><th className="num">Quantity</th><th className="num">Unit price</th><th>Date</th></tr></thead><tbody>{productPurchases.map((product, index) => <tr key={`${product.orderId}-${product.id}-${index}`}><td><b>{product.name}</b></td><td className="muted">{product.variant || "—"}</td><td>{product.reference || "—"}</td><td><span className={`status-pill status-${product.status}`}>{product.status}</span></td><td className="num">{product.quantity}</td><td className="num">{product.unitPrice == null ? "—" : `${fmt(product.unitPrice)} TND`}</td><td>{date(product.placedAt)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>No product details available</h3><p>Older Converty orders may not include cart item details. New synced orders will appear here when the data is provided.</p></div>}
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
