import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getCustomers, getSegments, getCohorts } from "@/lib/studio";
import { fmt, initials, avatarColor, tierChip, timeAgo, sourceText } from "@/lib/format";

const FILTERS = [
  { label: "All customers", source: "" },
  { label: "Influencer-acquired", source: "influencer" },
  { label: "Referral-acquired", source: "referral" },
  { label: "Campaign-acquired", source: "campaign" },
  { label: "Organic", source: "organic" },
];

const ACTION_BY_SOURCE: Record<string, string> = {
  influencer: "Send referral offer",
  referral: "Reward top referrers",
  organic: "Push loyalty rewards",
  campaign: "Reactivate with WhatsApp",
  returning: "Reward loyalty",
};

export default async function CustomersOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set("limit", "100");
  if (sp.source) qs.set("source", sp.source);
  if (sp.q) qs.set("q", sp.q);

  const [{ customers }, seg, cohorts] = await Promise.all([
    getCustomers(`?${qs.toString()}`),
    getSegments(),
    getCohorts(),
  ]);

  const total = cohorts.bySource.reduce((s, r) => s + r.customers, 0);
  const returning = cohorts.bySource.reduce((s, r) => s + r.secondDelivered, 0);
  const returningPct = total ? Math.round((returning / total) * 100) : 0;
  const influencerAcq = cohorts.bySource.find((r) => r.source === "influencer")?.customers || 0;
  const referralAcq = cohorts.bySource.find((r) => r.source === "referral")?.customers || 0;

  const customersTabs = [
    { label: "Segments", href: "/customers/segments" },
    { label: "All customers", href: "/customers", count: total },
    { label: "Cohorts", href: "/customers/cohorts" },
  ];

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb className="crumb" />
          <h1>Customers</h1>
          <div className="subt">
            Browse customers, understand where they came from, and see who comes back after a delivered order.
          </div>
        </div>
      </header>

      <Tabbar tabs={customersTabs} />

      <div className="content">
        {/* KPI ROW */}
        <div className="kpi-row" data-screen-label="KPIs">
          <div className="kpi feature">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
                  <path d="M17 7.5a3 3 0 010 5" />
                  <path d="M19.5 19.5c0-2.4-1.2-3.8-3-4.4" />
                </svg>
              </span>
              <span className="k-label">Total customers</span>
            </div>
            <div className="k-val">{fmt(total)}</div>
            <div className="k-foot">Identified by phone number</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M3 12a9 9 0 019-9 9 9 0 016.5 2.8L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.5-2.8L3 16" />
                </svg>
              </span>
              <span className="k-label">Returning customers</span>
            </div>
            <div className="k-val">{fmt(returning)}</div>
            <div className="k-foot">{returningPct}% have 2+ delivered orders</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <path d="M3 11l16-7-3 16-5-5-5 2z" />
                  <path d="M11 15l5-9" />
                </svg>
              </span>
              <span className="k-label">Influencer-acquired</span>
            </div>
            <div className="k-val">{fmt(influencerAcq)}</div>
            <div className="k-foot">First delivered order via influencer code</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <circle cx="6" cy="12" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <circle cx="18" cy="18" r="2.5" />
                  <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
                </svg>
              </span>
              <span className="k-label">Referral-acquired</span>
            </div>
            <div className="k-val">{fmt(referralAcq)}</div>
            <div className="k-foot">First delivered order via referral</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--warn-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
                </svg>
              </span>
              <span className="k-label">At-risk customers</span>
            </div>
            <div className="k-val">{fmt(seg.counts.atRisk)}</div>
            <div className="k-foot">No delivered order in 60 days</div>
          </div>
        </div>

        {/* FILTERS + TABLE */}
        <div className="block">
          <div className="filter-bar">
            {FILTERS.map((f) => {
              const active = (sp.source || "") === f.source;
              const href = f.source ? `/customers?source=${f.source}` : "/customers";
              return (
                <Link key={f.label} href={href} className={`fchip${active ? " on" : ""}`}>
                  {f.label}
                </Link>
              );
            })}
            <form className="search" style={{ width: "240px" }} action="/customers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input name="q" defaultValue={sp.q || ""} placeholder="Search by phone or name" />
            </form>
          </div>

          <div className="panel" data-screen-label="All customers table">
            <table className="dense">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th className="num">Placed</th>
                  <th className="num">Delivered</th>
                  <th className="num">Refused</th>
                  <th className="num">Spent</th>
                  <th className="num">Points</th>
                  <th>Status</th>
                  <th>Last delivered</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const src = sourceText(c.source);
                  const tier = tierChip(c.tier);
                  return (
                    <tr key={c.id} className="clickable">
                      <td>
                        <div className="who-cell">
                          <span className="av" style={{ background: avatarColor(c.id), width: "28px", height: "28px", fontSize: "11px" }}>
                            {initials(c.name)}
                          </span>
                          <span className="h">{c.name}</span>
                        </div>
                      </td>
                      <td className="muted">{c.phone}</td>
                      <td>
                        <div className="src">
                          <div className="s1">{src.s1}</div>
                          {src.s2 && <div className="s2">{src.s2}</div>}
                        </div>
                      </td>
                      <td className="num muted">{c.placed}</td>
                      <td className="num" style={{ color: "var(--pos-fg)" }}>{c.delivered}</td>
                      <td className="num" style={c.refused ? { color: "#A8463B" } : undefined}>{c.refused}</td>
                      <td className="num">{fmt(c.spent)}</td>
                      <td className="num">{c.points}</td>
                      <td>
                        <span className={`tchip ${tier.cls}`}>
                          <span className="dot" style={{ background: tier.dot }}></span>
                          {tier.label}
                        </span>
                      </td>
                      <td className="muted">{timeAgo(c.lastDeliveredAt)}</td>
                      <td>
                        <Link href={`/customers/${c.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pager">
              <div className="info">
                Showing {customers.length} of {fmt(total)} customers ·{" "}
                <b style={{ color: "var(--text-primary)" }}>Placed</b> vs{" "}
                <b style={{ color: "var(--pos-fg)" }}>delivered</b> — delivered &amp; paid is the source of truth
              </div>
            </div>
          </div>
        </div>

        {/* COHORTS + RECOMMENDATION */}
        <div className="block grid-12">
          <div className="panel span8" data-screen-label="Cohort analysis">
            <div className="p-head">
              <div>
                <h3>Cohort analysis</h3>
                <div className="sub">
                  Observed repeat behavior after the first delivered order, by acquisition source
                </div>
              </div>
              <span className="tnote">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Based on delivered &amp; paid orders
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Customers</th>
                  <th className="num">2nd delivered</th>
                  <th>Repeat rate</th>
                  <th className="num">Revenue</th>
                  <th>Suggested action</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.bySource.map((c) => (
                  <tr key={c.source}>
                    <td style={{ fontWeight: 700, textTransform: "capitalize" }}>{c.source}</td>
                    <td className="num">{fmt(c.customers)}</td>
                    <td className="num">{fmt(c.secondDelivered)}</td>
                    <td>
                      <span className="rrate">
                        <span className="bar">
                          <i style={{ width: `${c.repeatPct}%`, ...(c.repeatPct < 30 ? { background: "#C98A2B" } : {}) }}></i>
                        </span>
                        <span className="pct">{c.repeatPct}%</span>
                      </span>
                    </td>
                    <td className="num">
                      {fmt(c.revenue)}{" "}
                      <span className="muted" style={{ fontSize: "10.5px", fontWeight: 600 }}>TND</span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">{ACTION_BY_SOURCE[c.source] || "Push loyalty"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tbl-foot">
              Cohorts are based on <b>delivered &amp; paid orders</b>, not orders placed.
            </div>
          </div>

          <div className="span4">
            <div className="opp" data-screen-label="Recommended next move">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Recommended next move
              </span>
              <div className="o-head">
                <span className="o-av" style={{ background: "#7C5A43" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                    <path d="M3 11l16-7-3 16-5-5-5 2z" />
                  </svg>
                </span>
                <div>
                  <div className="o-metric">
                    {fmt(influencerAcq)} <span className="u">customers</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Influencer-acquired
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>Influencer-acquired customers repeat less than referral-acquired ones.</b> Turn them into
                referrers — referrals tend to come back more.
              </div>
              <div className="o-cta">
                <Link className="btn btn-primary" href="/influence/referral">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Send WhatsApp referral offer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
