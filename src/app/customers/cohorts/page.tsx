import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getCohorts, getOverview, getSegments } from "@/lib/studio";
import { fmt } from "@/lib/format";

const customersTabs = [
  { label: "Segments", href: "/customers/segments" },
  { label: "All customers", href: "/customers" },
  { label: "Cohorts", href: "/customers/cohorts" },
];

const ACTION_BY_SOURCE: Record<string, string> = {
  influencer: "Send referral offer",
  referral: "Reward top referrers",
  organic: "Push loyalty rewards",
  campaign: "Reactivate with WhatsApp",
};

const TndSm = () => (
  <span className="muted" style={{ fontSize: "10.5px", fontWeight: 600 }}>
    TND
  </span>
);

export default async function CohortsPage() {
  const [cohorts, overview, seg] = await Promise.all([getCohorts(), getOverview(), getSegments()]);
  const rows = [...cohorts.bySource].filter((r) => r.customers > 0);

  const repeatTotal = rows.reduce((s, r) => s + r.secondDelivered, 0);
  const sorted = [...rows].sort((a, b) => b.repeatPct - a.repeatPct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const influencer = rows.find((r) => r.source === "influencer");
  const referral = rows.find((r) => r.source === "referral");
  const currentMonthKey = new Date().toISOString().slice(0, 7);

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb className="crumb" />
          <h1>Customers</h1>
          <div className="subt">
            Understand which acquisition sources bring customers who come back after a delivered order.
          </div>
        </div>
      </header>

      <Tabbar tabs={customersTabs} />

      <div className="content">
        {/* EXPLANATION CARD */}
        <div className="explain-card" data-screen-label="Explanation">
          <span className="ec-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12a9 9 0 019-9 9 9 0 016.5 2.8L21 8M21 3v5h-5" />
              <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.5-2.8L3 16M3 21v-5h5" />
            </svg>
          </span>
          <div>
            <div className="ec-t">Cohorts are based on delivered orders</div>
            <div className="ec-c">
              Fidely groups customers by their first delivered &amp; paid order, then tracks whether they
              come back for another delivered order.
            </div>
          </div>
          <span className="ec-badge tnote">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Delivered &amp; paid = source of truth
          </span>
        </div>

        {/* KPI ROW */}
        <div className="kpi-row block" data-screen-label="KPIs">
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
                  <path d="M16 11l2 2 4-4" />
                </svg>
              </span>
              <span className="k-label">New customers</span>
            </div>
            <div className="k-val">{fmt(overview.kpis.customers.total)}</div>
            <div className="k-foot">First delivered order · last 30 days</div>
          </div>
          <div className="kpi feature">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M3 12a9 9 0 019-9 9 9 0 016.5 2.8L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.5-2.8L3 16" />
                </svg>
              </span>
              <span className="k-label">Repeat customers</span>
            </div>
            <div className="k-val">{fmt(repeatTotal)}</div>
            <div className="k-foot">2+ delivered orders</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
                </svg>
              </span>
              <span className="k-label">Best repeat source</span>
            </div>
            <div className="k-val" style={{ fontSize: "23px", color: "var(--pos-fg)", textTransform: "capitalize" }}>
              {best?.source || "—"}
            </div>
            <div className="k-foot">{best?.repeatPct || 0}% reached a 2nd delivered order</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--warn-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
                </svg>
              </span>
              <span className="k-label">Lowest repeat source</span>
            </div>
            <div className="k-val" style={{ fontSize: "19px", color: "#9A6A1E", textTransform: "capitalize" }}>
              {worst?.source || "—"}
            </div>
            <div className="k-foot">{worst?.repeatPct || 0}% reached a 2nd delivered order</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <path d="M3 11l16-7-3 16-5-5-5 2z" />
                  <path d="M11 15l5-9" />
                </svg>
              </span>
              <span className="k-label">Customers to activate</span>
            </div>
            <div className="k-val">{fmt(seg.counts.influencerAcquired)}</div>
            <div className="k-foot">Influencer-acquired · ready to refer</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="block">
          <div className="cfilter">
            <span className="fl">View by</span>
            <span className="fseg">
              <button className="on">Acquisition source</button>
              <button>First delivered month</button>
            </span>
            <span className="val-chip" style={{ marginLeft: "auto" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Order basis: Delivered &amp; paid only
            </span>
          </div>
        </div>

        {/* SOURCE COHORTS + RECOMMENDATION */}
        <div className="block grid-12">
          <div className="panel span8" data-screen-label="Cohorts by source">
            <div className="p-head">
              <div>
                <h3>Repeat behavior by acquisition source</h3>
                <div className="sub">
                  Which sources bring customers who come back after their first delivered order
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Customers</th>
                  <th className="num">2nd delivered</th>
                  <th>Repeat rate</th>
                  <th className="num">Sales from cohort</th>
                  <th>Suggested action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
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
                      {fmt(c.revenue)} <TndSm />
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">{ACTION_BY_SOURCE[c.source] || "Push loyalty"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tbl-foot">
              <b>Repeat rate</b> = share of the cohort that came back for a 2nd delivered order. Cohorts are
              based on <b>delivered &amp; paid orders</b>, not orders placed.
            </div>
          </div>

          <div className="span4">
            <div className="opp" data-screen-label="Best cohort opportunity">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Best cohort opportunity
              </span>
              <div className="o-head">
                <span className="o-av" style={{ background: "#7C5A43" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                    <path d="M3 11l16-7-3 16-5-5-5 2z" />
                  </svg>
                </span>
                <div>
                  <div className="o-metric">
                    {influencer?.repeatPct ?? 0}% <span className="u">vs {referral?.repeatPct ?? 0}%</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Influencer vs referral repeat
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>Influencer-acquired customers repeat less than referral-acquired ones.</b> Only{" "}
                {influencer?.repeatPct ?? 0}% reached a 2nd delivered order, vs {referral?.repeatPct ?? 0}% for referrals.
              </div>
              <div className="o-cta" style={{ flexDirection: "column" }}>
                <Link className="btn btn-primary" href="/influence/referral">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Send WhatsApp referral offer
                </Link>
                <Link href="/customers?source=influencer" className="btn btn-secondary" style={{ justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  View influencer-acquired customers
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* MONTH COHORTS */}
        <div className="block" data-screen-label="Cohorts by month">
          <div className="panel">
            <div className="p-head">
              <div>
                <h3>Repeat behavior by first delivered month</h3>
                <div className="sub">
                  How customers from each month returned after their first delivered order
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
                  <th>First delivered month</th>
                  <th className="num">New customers</th>
                  <th className="num">2nd delivered</th>
                  <th className="num">3rd delivered</th>
                  <th>Repeat rate</th>
                  <th className="num">Sales from cohort</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.byMonth.map((m) => {
                  const young = m.monthKey === currentMonthKey;
                  return (
                    <tr key={m.monthKey}>
                      <td style={{ fontWeight: 700 }}>
                        {m.month}
                        {young && (
                          <span className="tag-mini" style={{ color: "var(--warn-fg)", background: "var(--warn-bg)", borderColor: "#F1E2C4" }}>
                            Still young
                          </span>
                        )}
                      </td>
                      <td className="num">{fmt(m.newCustomers)}</td>
                      <td className="num">{fmt(m.second)}</td>
                      <td className={`num${m.third === 0 ? " muted" : ""}`}>{fmt(m.third)}</td>
                      <td>
                        <span className="rrate">
                          <span className="bar">
                            <i style={{ width: `${m.repeatPct}%`, ...(young ? { background: "#C98A2B" } : {}) }}></i>
                          </span>
                          <span className="pct" style={young ? { color: "var(--text-secondary)" } : undefined}>
                            {m.repeatPct}%
                          </span>
                        </span>
                      </td>
                      <td className="num">
                        {fmt(m.sales)} <TndSm />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tbl-foot">
              The most recent month is still young — many customers have not had enough time to place a second
              delivered order.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
