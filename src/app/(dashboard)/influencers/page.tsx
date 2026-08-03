import Link from "next/link";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getInfluencers } from "@/lib/studio";
import { fmt } from "@/lib/format";

export default async function InfluencersPage() {
  const { influencers } = await getInfluencers();
  const customers = influencers.reduce((sum, item) => sum + item.customers, 0);
  const delivered = influencers.reduce((sum, item) => sum + item.delivered, 0);
  const revenue = influencers.reduce((sum, item) => sum + item.earned, 0);
  const budget = influencers.reduce((sum, item) => sum + (item.budget || 0), 0);
  const maxRevenue = Math.max(1, ...influencers.map((item) => item.earned));

  return <>
    <header className="topbar"><div><ConvertySyncCrumb className="crumb"/><h1>Influencers</h1><div className="subt">Track customers and delivered revenue generated through Converty promo codes.</div></div><div className="tb-actions"><Link className="btn btn-primary" href="/campaigns?view=create">Add to campaign</Link></div></header>
    <div className="content">
      <section className="kpi-row">{[["Influencers", influencers.length], ["Customers acquired", customers], ["Delivered orders", delivered], ["Delivered revenue", `${fmt(revenue)} TND`], ["Tracked budget", `${fmt(budget)} TND`]].map(([label,value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      {influencers.length ? <>
        <section className="panel block influencer-chart"><div className="p-head"><div><h3>Revenue by influencer</h3><div className="sub">Delivered Converty orders attributed through each promo code</div></div></div><div className="influencer-bars">{influencers.map((item) => <div className="influencer-bar-row" key={item.id}><div><strong>{item.handle}</strong><small>{item.code}</small></div><div className="influencer-bar-track"><i style={{ width: `${Math.max(2, item.earned / maxRevenue * 100)}%` }}/></div><b>{fmt(item.earned)} TND</b></div>)}</div></section>
        <section className="panel block"><div className="p-head"><div><h3>Influencer performance</h3><div className="sub">Promo-code attribution updates whenever orders synchronize.</div></div></div><div className="table-scroll"><table><thead><tr><th>Influencer</th><th>Promo code</th><th className="num">Customers</th><th className="num">Placed</th><th className="num">Delivered</th><th className="num">Delivery rate</th><th className="num">Revenue</th></tr></thead><tbody>{influencers.map((item) => <tr key={item.id}><td><div className="who-cell"><span className="av" style={{background:item.avatarBg}}>{item.handle.charAt(0).toUpperCase()}</span><span><span className="h">{item.handle}</span><span className="p">{item.platform}</span></span></div></td><td><span className="code">{item.code}</span></td><td className="num">{item.customers}</td><td className="num">{item.placed}</td><td className="num positive">{item.delivered}</td><td className="num">{item.deliveredPct}%</td><td className="num">{fmt(item.earned)} TND</td></tr>)}</tbody></table></div></section>
      </> : <section className="panel block"><div className="empty-state"><span className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M16 7h5M18.5 4.5v5"/></svg></span><h3>No influencers yet</h3><p>Add influencers to a campaign with their unique Converty promo codes. Fidely will attribute their customers automatically.</p><Link className="btn btn-primary" href="/campaigns?view=create">Create influencer campaign</Link></div></section>}
    </div>
  </>;
}
