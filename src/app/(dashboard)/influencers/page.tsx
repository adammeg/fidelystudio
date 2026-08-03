import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getInfluencers } from "@/lib/studio";
import { fmt } from "@/lib/format";
import InfluencerCampaignForm from "@/components/studio/InfluencerCampaignForm";

export default async function InfluencersPage() {
  const { influencers, timeline } = await getInfluencers();
  const customers = influencers.reduce((sum, item) => sum + item.customers, 0);
  const delivered = influencers.reduce((sum, item) => sum + item.delivered, 0);
  const revenue = influencers.reduce((sum, item) => sum + item.earned, 0);
  const budget = influencers.reduce((sum, item) => sum + (item.budget || 0), 0);
  const maxRevenue = Math.max(1, ...influencers.map((item) => item.earned));
  const byDate = new Map<string, { orders: number; revenue: number }>();
  for (const row of timeline) { const current = byDate.get(row.date) || { orders: 0, revenue: 0 }; byDate.set(row.date, { orders: current.orders + row.orders, revenue: current.revenue + row.revenue }); }
  const timeSeries = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  const maxOrders = Math.max(1, ...timeSeries.map(([, value]) => value.orders));
  const points = timeSeries.map(([, value], index) => `${timeSeries.length === 1 ? 50 : index / (timeSeries.length - 1) * 100},${100 - value.orders / maxOrders * 86}`).join(" ");

  return <>
    <header className="topbar"><div><ConvertySyncCrumb className="crumb"/><h1>Influencer campaigns</h1><div className="subt">Independent promo-code campaigns. No WhatsApp messages are sent.</div></div><div className="tb-actions"><a className="btn btn-primary" href="#add-influencers">Add influencer</a></div></header>
    <div className="content">
      <section className="kpi-row">{[["Influencers", influencers.length], ["Customers acquired", customers], ["Delivered orders", delivered], ["Delivered revenue", `${fmt(revenue)} TND`], ["Tracked budget", `${fmt(budget)} TND`]].map(([label,value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      <div id="add-influencers"><InfluencerCampaignForm /></div>
      {influencers.length ? <>
        <section className="panel block"><div className="p-head"><div><h3>Orders over time</h3><div className="sub">Promo-code orders across all influencer campaigns · last 30 active days</div></div></div>{timeSeries.length ? <div className="influencer-time-chart"><div className="chart-y"><span>{maxOrders}</span><span>{Math.round(maxOrders / 2)}</span><span>0</span></div><svg viewBox="0 0 100 108" preserveAspectRatio="none" role="img" aria-label="Influencer orders over time"><defs><linearGradient id="influencerArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".22"/><stop offset="1" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs><path d={`M ${points.replaceAll(" ", " L ")} L 100 100 L 0 100 Z`} fill="url(#influencerArea)"/><polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg><div className="chart-dates"><span>{timeSeries[0]?.[0]}</span><span>{timeSeries.at(-1)?.[0]}</span></div></div> : <div className="empty-state"><p>Order activity will appear after customers use an influencer promo code.</p></div>}</section>
        <section className="panel block influencer-chart"><div className="p-head"><div><h3>Revenue by influencer</h3><div className="sub">Delivered Converty orders attributed through each promo code</div></div></div><div className="influencer-bars">{influencers.map((item) => <div className="influencer-bar-row" key={item.id}><div><strong>{item.handle}</strong><small>{item.code}</small></div><div className="influencer-bar-track"><i style={{ width: `${Math.max(2, item.earned / maxRevenue * 100)}%` }}/></div><b>{fmt(item.earned)} TND</b></div>)}</div></section>
        <section className="panel block"><div className="p-head"><div><h3>Influencer performance</h3><div className="sub">A campaign is profitable when delivered revenue exceeds the amount spent.</div></div></div><div className="table-scroll"><table><thead><tr><th>Influencer</th><th>Promo code</th><th className="num">Budget</th><th className="num">Customers</th><th className="num">Orders</th><th className="num">Delivered</th><th className="num">Revenue</th><th>Verdict</th></tr></thead><tbody>{influencers.map((item) => <tr key={item.id}><td><div className="who-cell"><span className="av" style={{background:item.avatarBg}}>{item.handle.charAt(0).toUpperCase()}</span><span><span className="h">{item.handle}</span><span className="p">Independent campaign</span></span></div></td><td><span className="code">{item.code}</span></td><td className="num">{fmt(item.budget || 0)} TND</td><td className="num">{item.customers}</td><td className="num">{item.placed}</td><td className="num positive">{item.delivered}</td><td className="num">{fmt(item.earned)} TND</td><td><span className={`status-pill${item.profitable ? " live" : ""}`}>{item.result.label}</span>{item.roiPct !== null && item.roiPct !== undefined && <div className={item.roiPct >= 0 ? "positive" : "muted"}>{item.roiPct}% ROI</div>}</td></tr>)}</tbody></table></div></section>
      </> : <section className="panel block"><div className="empty-state"><span className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M16 7h5M18.5 4.5v5"/></svg></span><h3>No influencer results yet</h3><p>Add an influencer above, then synchronize after customers use the matching promo code.</p><a className="btn btn-primary" href="#add-influencers">Add influencer</a></div></section>}
    </div>
  </>;
}
