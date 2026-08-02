import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getCustomers, getSegments, getCohorts } from "@/lib/studio";
import { fmt, initials, avatarColor, timeAgo } from "@/lib/format";

const segmentLabels: Record<string, string> = { vip: "VIP", atRisk: "At risk", dormant: "Dormant", highBasket: "High basket", closeReward: "Close to reward", influencerAcquired: "Influencer" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; segment?: string; source?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ limit: "100" });
  if (sp.q) qs.set("q", sp.q);
  if (sp.segment) qs.set("segment", sp.segment);
  if (sp.source) qs.set("source", sp.source);
  if (sp.from) qs.set("from", sp.from);
  if (sp.to) qs.set("to", sp.to);
  const [{ customers, currency }, segments, cohorts] = await Promise.all([
    getCustomers(`?${qs}`), getSegments(), getCohorts(),
  ]);
  const total = cohorts.bySource.reduce((sum, row) => sum + row.customers, 0);
  const returning = cohorts.bySource.reduce((sum, row) => sum + row.secondDelivered, 0);
  const revenue = cohorts.bySource.reduce((sum, row) => sum + row.revenue, 0);
  const tabs = [
    { label: "Segments", href: "/customers/segments" },
    { label: "All customers", href: "/customers", count: total },
    { label: "Cohorts", href: "/customers/cohorts" },
  ];

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div><ConvertySyncCrumb className="crumb" /><h1>Customers</h1>
          <div className="subt">People identified from your real Converty orders.</div>
        </div>
      </header>
      <Tabbar tabs={tabs} />
      <div className="content">
        <section className="kpi-row">
          {[
            ["Total customers", fmt(total), "Identified by phone"],
            ["Repeat customers", fmt(returning), "Two or more delivered orders"],
            ["Delivered revenue", `${fmt(revenue)} ${currency}`, "Across customer cohorts"],
            ["At risk", fmt(segments.counts.atRisk), "Last delivery 60–89 days ago"],
          ].map(([label, value, note], i) => (
            <article key={label} className={`kpi${i === 0 ? " feature" : ""}`}>
              <div className="k-label">{label}</div><div className="k-val">{value}</div><div className="k-foot">{note}</div>
            </article>
          ))}
        </section>
        <section className="block">
          <div className="filter-bar">
            <form className="search" action="/customers">
              {sp.segment && <input type="hidden" name="segment" value={sp.segment} />}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
              <input name="q" defaultValue={sp.q || ""} placeholder="Search name or phone" />
              <select name="source" defaultValue={sp.source || ""} aria-label="Acquisition source">
                <option value="">All sources</option><option value="direct">Direct</option><option value="influencer">Influencer</option>
                <option value="referral">Referral</option><option value="campaign">Campaign</option><option value="ads">Ads</option>
              </select>
              <input type="date" name="from" defaultValue={sp.from || ""} aria-label="Delivered from" />
              <input type="date" name="to" defaultValue={sp.to || ""} aria-label="Delivered to" />
              <button className="btn btn-secondary" type="submit">Apply</button>
              <a className="btn btn-secondary" href={`/api/studio/customers/export?${qs}`}>Export CSV</a>
            </form>
          </div>
          <div className="panel">
            {customers.length ? (
              <div className="table-scroll"><table className="dense customer-table">
                <thead><tr><th>Customer</th><th>Segments</th><th>Phone</th><th className="num">Placed</th><th className="num">Delivered</th><th className="num">Refused</th><th className="num">Revenue</th><th>Last delivered</th><th /></tr></thead>
                <tbody>{customers.map((customer) => (
                  <tr key={customer.id}>
                    <td><div className="who-cell"><span className="av" style={{ background: avatarColor(customer.id) }}>{initials(customer.name)}</span><span className="h">{customer.name}</span></div></td>
                    <td><div className="tag-wrap">{customer.segments.length ? customer.segments.map((segment) => <span className="tag-pill" key={segment}>{segmentLabels[segment]}</span>) : <span className="muted">Standard</span>}</div></td>
                    <td className="muted">{customer.phone}</td>
                    <td className="num">{customer.placed}</td><td className="num positive">{customer.delivered}</td>
                    <td className="num">{customer.refused}</td><td className="num">{fmt(customer.spent)} {currency}</td>
                    <td className="muted">{timeAgo(customer.lastDeliveredAt)}</td>
                    <td><Link href={`/customers/${customer.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : (
              <div className="empty-state"><h3>{sp.q ? "No matching customers" : "No customers synced yet"}</h3>
                <p>{sp.q ? "Try a different name or phone number." : "Connect Converty in Settings, then sync your store orders."}</p>
                {!sp.q && <Link href="/settings" className="btn btn-primary">Connect Converty</Link>}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
