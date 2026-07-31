import Link from "next/link";
import { Suspense } from "react";
import PerformanceChart, { type ChartKey, type ChartSeriesInput } from "@/components/studio/PerformanceChart";
import AdvancedDetails from "@/components/studio/AdvancedDetails";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import MarkAsPaidButton from "@/components/studio/MarkAsPaidButton";
import PeriodSelector from "@/components/studio/PeriodSelector";
import { getOverview } from "@/lib/studio";
import { fmt, resultChip, platformLabel, stateChip } from "@/lib/format";

const Unit = () => (
  <span className="muted" style={{ fontWeight: 600, fontSize: "11px" }}>
    TND
  </span>
);

function rewardIcon(icon: string) {
  if (icon === "voucher") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 7h20v5H2zM12 7v13M12 7S9 3 6.5 4 8 7 12 7zM12 7s3-4 5.5-3-.5 3-5.5 3z" />
      </svg>
    );
  }
  if (icon === "delivery") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 7h13v8H3zM16 10h3l2 3v2h-5z" />
        <circle cx="7" cy="17" r="1.7" />
        <circle cx="18" cy="17" r="1.7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
    </svg>
  );
}

function trendInfo(n: number) {
  const up = n >= 0;
  return {
    cls: up ? "up" : "down",
    text: `${Math.abs(n)}%`,
    arrow: up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7",
  };
}

function labelFor(key: string) {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function StudioOverview({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.min(90, Math.max(7, Number(sp.days) || 30));
  const data = await getOverview(days);
  const { kpis, chart, advanced, topCampaigns, topInfluencers, segments, topRewards } = data;

  const series: Record<ChartKey, ChartSeriesInput> = {
    sales: { label: "Sales", unit: "TND", total: fmt(kpis.sales.total), trend: `+${kpis.sales.trend}%`, color: "#C8744F", fill: "rgba(200,116,79,.16)", v: chart.series.sales.v },
    delivered: { label: "Delivered orders", unit: "orders", total: fmt(kpis.delivered.total), trend: `+${kpis.delivered.trend}%`, color: "#7C5A43", fill: "rgba(124,90,67,.14)", v: chart.series.delivered.v },
    cost: { label: "Cost", unit: "TND", total: fmt(kpis.cost.total), trend: `+${kpis.cost.trend}%`, color: "#C98A2B", fill: "rgba(201,138,43,.15)", v: chart.series.cost.v },
    customers: { label: "New customers", unit: "customers", total: fmt(kpis.customers.total), trend: `+${kpis.customers.trend}%`, color: "#3E8E5A", fill: "rgba(62,142,90,.14)", v: chart.series.customers.v },
  };
  const xLabels = (() => {
    const L = chart.labels;
    if (!L.length) return [];
    const idx = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => Math.round(p * (L.length - 1)));
    return [...new Set(idx)].map((i) => labelFor(L[i]));
  })();

  const salesTrend = trendInfo(kpis.sales.trend);
  const deliveredTrend = trendInfo(kpis.delivered.trend);
  const toPayTotal = topInfluencers.reduce((s, i) => s + i.toPay, 0);
  const toPayCount = topInfluencers.filter((i) => i.toPay > 0).length;

  const advancedMetrics = [
    { label: "CAC", sub: "Cost per acquired customer", value: `${advanced.cac} TND` },
    { label: "ROAS", sub: "Return on spend", value: `${advanced.roas}×` },
    { label: "Attribution window", sub: "Order → delivery", value: `${advanced.attributionDays} days` },
    { label: "Delivery rate", sub: "Delivered ÷ placed", value: `${advanced.deliveryRate}%` },
  ];

  const topInf = topInfluencers[0];
  const topInfReturn = topInf ? (topInf.commission ? (topInf.earned / topInf.commission).toFixed(1) : "—") : "—";

  const segRows = [
    { count: segments.counts.atRisk, shortLabel: "at-risk", name: "At-risk customers", rule: "No delivered order in the last 60 days" },
    { count: segments.counts.closeReward, shortLabel: "close", name: "Close to a reward", rule: "Within reach of their next reward" },
    { count: segments.counts.influencerAcquired, shortLabel: "via inf.", name: "Influencer-acquired", rule: "First delivered order came from an influencer code" },
    { count: segments.counts.dormant, shortLabel: "dormant", name: "Dormant customers", rule: "Bought before, no delivered order in 90+ days" },
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Studio</h1>
          <ConvertySyncCrumb className="crumb sync" />
        </div>
        <div className="tb-actions">
          <Suspense fallback={<button className="period">Last 30 days</button>}>
            <PeriodSelector />
          </Suspense>
          <a className="btn btn-secondary" href="/widgets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            Preview widget
          </a>
          <a className="btn btn-primary" href="/campaigns">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create a campaign
          </a>
        </div>
      </header>

      <div className="content">
        {/* ===== KPI ROW ===== */}
        <div className="kpi-row" data-screen-label="KPIs">
          <div className="kpi feature">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M4 18l5-5 4 3 7-8" />
                  <path d="M16 7h5v5" />
                </svg>
              </span>
              <span className="k-label">Earned</span>
            </div>
            <div className="k-val">
              {fmt(kpis.sales.total)}<span className="u">TND</span>
            </div>
            <div className="k-foot">
              <span className={`trend ${salesTrend.cls}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d={salesTrend.arrow} />
                </svg>
                {salesTrend.text}
              </span>{" "}
              vs previous 30 days
            </div>
          </div>

          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--bg-sunken)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                  <path d="M12 3v18M7 7h7a3 3 0 010 6H9a3 3 0 000 6h8" />
                </svg>
              </span>
              <span className="k-label">Spent</span>
            </div>
            <div className="k-val">
              {fmt(kpis.cost.total)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Commissions, rewards &amp; messaging</div>
          </div>

          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <path d="M3 7h13l2 4h3v6H3z" />
                  <circle cx="7" cy="18" r="1.8" />
                  <circle cx="17" cy="18" r="1.8" />
                </svg>
              </span>
              <span className="k-label">Delivered orders</span>
            </div>
            <div className="k-val">{fmt(kpis.delivered.total)}</div>
            <div className="k-foot">
              <span className={`trend ${deliveredTrend.cls}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d={deliveredTrend.arrow} />
                </svg>
                {deliveredTrend.text}
              </span>{" "}
              generated by Fidely
            </div>
          </div>

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
            <div className="k-val">{fmt(kpis.customers.total)}</div>
            <div className="k-foot">First delivered order via Fidely</div>
          </div>

          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--warn-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="k-label">Commissions to pay</span>
            </div>
            <div className="k-val">
              {fmt(toPayTotal)}<span className="u">TND</span>
            </div>
            <div className="k-foot">
              <span className="chip-i c-pay" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                To pay
              </span>{" "}
              {toPayCount} influencer{toPayCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* ===== CHART ===== */}
        <div className="block" data-screen-label="Performance chart">
          <PerformanceChart series={series} xLabels={xLabels} />
        </div>

        {/* ===== OPPORTUNITIES ===== */}
        <div className="block" data-screen-label="Opportunities">
          <div className="block-head">
            <div>
              <h2>Your opportunities this week</h2>
              <div className="sub">Three moves Fidely suggests, each one click to launch</div>
            </div>
            <button className="btn btn-ghost">
              View all
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="opp-row">
            <div className="opp">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Scale a winner
              </span>
              <div className="o-head">
                <span className="o-av round" style={{ background: topInf ? topInf.avatarBg : "#C8744F" }}>
                  {topInf ? topInf.handle.replace("@", "").charAt(0) : "S"}
                </span>
                <div>
                  <div className="o-metric">{topInfReturn}× return</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {topInf ? `${topInf.handle} · ${platformLabel(topInf.platform)}` : "—"}
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>{topInf?.handle || "Your top influencer"} earned {topInfReturn}× more than they cost.</b> Your
                top influencer this period — more budget could bring more delivered orders.
              </div>
              <div className="o-cta">
                <Link className="btn btn-primary" href={topCampaigns[0] ? `/influence/campaigns/${topCampaigns[0].slug}` : "/influence"}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Increase the budget
                </Link>
                <Link className="btn btn-secondary btn-sm" href={topCampaigns[0] ? `/influence/campaigns/${topCampaigns[0].slug}` : "/influence"}>
                  Details
                </Link>
              </div>
            </div>

            <div className="opp">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Turn buyers into referrers
              </span>
              <div className="o-head">
                <span className="o-av" style={{ background: "#7C5A43" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3 20c0-3 2.5-4.6 6-4.6M15 11l2 2 4-4" />
                  </svg>
                </span>
                <div>
                  <div className="o-metric">
                    {fmt(segments.counts.influencerAcquired)} <span className="u">customers</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Acquired by influencers
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>{fmt(segments.counts.influencerAcquired)} influencer-acquired customers can still refer a friend.</b> A
                short WhatsApp offer could turn happy buyers into your next channel.
              </div>
              <div className="o-cta">
                <Link className="btn btn-primary" href="/campaigns?segment=influencerAcquired&goal=Referral&name=Referral+WhatsApp+offer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Send a WhatsApp offer
                </Link>
                <Link className="btn btn-secondary btn-sm" href="/customers/segments">Details</Link>
              </div>
            </div>

            <div className="opp">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Nudge a reward
              </span>
              <div className="o-head">
                <span className="o-av" style={{ background: "#3E8E5A" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9">
                    <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                  </svg>
                </span>
                <div>
                  <div className="o-metric">
                    {fmt(segments.counts.closeReward)} <span className="u">customers</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Close to a reward
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>{fmt(segments.counts.closeReward)} customers are close to a reward.</b> A double-points weekend
                could be the nudge that brings their next order.
              </div>
              <div className="o-cta">
                <Link className="btn btn-primary" href="/campaigns?segment=closeReward&incentive=points&name=Double-points+weekend&goal=Repeat+purchase">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                  </svg>
                  Launch double points
                </Link>
                <Link className="btn btn-secondary btn-sm" href="/loyalty">Details</Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM GRID ===== */}
        <div className="block grid-12" data-screen-label="Top performers">
          {/* Top campaigns */}
          <div className="panel span7">
            <div className="p-head">
              <div>
                <h3>Top campaigns</h3>
                <div className="sub">What each has earned over its run</div>
              </div>
              <a className="btn btn-ghost btn-sm" href="/influence">
                View all
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>State</th>
                  <th className="num">Earned</th>
                  <th className="num">Spent</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => {
                  const st = stateChip(c.state);
                  const res = resultChip(c.result.level, c.result.label);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="cmp-name">
                          {c.name} <span className="tag-mini">{c.type}</span>
                        </span>
                      </td>
                      <td>
                        <span className="lc">
                          <span className="dot" style={{ background: st.dot }}></span>
                          {st.label}
                        </span>
                        <div className="lc-sub">{c.durationLabel || "—"}</div>
                      </td>
                      {c.earned ? (
                        <td className="num">
                          {fmt(c.earned)} <Unit />
                        </td>
                      ) : (
                        <td className="num muted">—</td>
                      )}
                      {c.spent ? (
                        <td className="num">
                          {fmt(c.spent)} <Unit />
                        </td>
                      ) : (
                        <td className="num muted">—</td>
                      )}
                      <td>
                        <span className={`chip-i ${res.cls}`}>
                          <span className="dot" style={{ background: res.dot }}></span>
                          {res.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tbl-foot">
              Studio&apos;s <b>{fmt(kpis.sales.total)} TND earned</b> is the last 30 days of delivered &amp; paid orders.
            </div>
          </div>

          {/* Top influencers */}
          <div className="panel span5">
            <div className="p-head">
              <div>
                <h3>Top influencers</h3>
                <div className="sub">{fmt(toPayTotal)} TND in commissions to pay</div>
              </div>
              <a className="btn btn-ghost btn-sm" href="/influence">
                View all
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="ilist">
              {topInfluencers.map((inf) => (
                <div className="irow" key={inf.id}>
                  <span className="av" style={{ background: inf.avatarBg }}>
                    {inf.handle.replace("@", "").charAt(0)}
                  </span>
                  <div className="iwho">
                    <div className="nm">{inf.handle}</div>
                    <div className="pl">
                      {platformLabel(inf.platform)} · {inf.code}
                    </div>
                  </div>
                  <div className="pay">
                    <div className="e">
                      {fmt(inf.earned)} <span className="u">TND earned</span>
                    </div>
                    <div className="payline">
                      {inf.paid ? (
                        <span className="chip-i c-paid">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          Paid
                        </span>
                      ) : (
                        <>
                          <span className="topay">
                            To pay: <b>{fmt(inf.toPay)} TND</b>
                          </span>
                          <MarkAsPaidButton influencerId={inf.id} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Segments to activate */}
          <div className="panel span7">
            <div className="p-head">
              <div>
                <h3>Segments to activate</h3>
                <div className="sub">Grouped by delivered-order behavior</div>
              </div>
              <Link className="btn btn-ghost btn-sm" href="/customers/segments">
                All segments
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <div className="seg-list">
              {segRows.map((s) => (
                <div className="seg-row" key={s.name}>
                  <div className="sc">
                    <div className="n">{fmt(s.count)}</div>
                    <div className="l">{s.shortLabel}</div>
                  </div>
                  <div className="meta">
                    <div className="nm">{s.name}</div>
                    <div className="rule">{s.rule}</div>
                  </div>
                  <a className="btn btn-secondary btn-sm" href="/campaigns">
                    Create a campaign
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Top rewards */}
          <div className="panel span5">
            <div className="p-head">
              <div>
                <h3>Top rewards</h3>
                <div className="sub">Redeemed after delivered orders</div>
              </div>
              <a className="btn btn-ghost btn-sm" href="/loyalty">
                Manage
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </div>
            <div className="rwd">
              {topRewards.map((r) => (
                <div className="rwd-row" key={r.name}>
                  <div className="rw-top">
                    <span className="rw-nm">
                      <span className="rw-ic">{rewardIcon(r.icon)}</span>
                      {r.name}
                    </span>
                    <span className="rw-ct">
                      {r.redeemed} <span>redeemed</span>
                    </span>
                  </div>
                  <div className="rwd-bar">
                    <i style={{ width: `${r.pct}%` }}></i>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ADVANCED DETAILS */}
        <div className="block tail-block" data-screen-label="Advanced details">
          <AdvancedDetails metrics={advancedMetrics} />
        </div>
      </div>
    </>
  );
}
