import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getCohorts } from "@/lib/studio";
import { fmt } from "@/lib/format";

export default async function CohortsPage() {
  const cohorts = await getCohorts();
  const tabs = [
    { label: "Segments", href: "/customers/segments" },
    { label: "All customers", href: "/customers" },
    { label: "Cohorts", href: "/customers/cohorts" },
  ];
  return <div className="has-tabbar">
    <header className="topbar"><div><ConvertySyncCrumb className="crumb" /><h1>Customer cohorts</h1>
      <div className="subt">See whether customers return after their first delivered order.</div></div>
    </header>
    <Tabbar tabs={tabs} />
    <div className="content">
      <div className="explain-card"><div><div className="ec-t">Delivered orders are the source of truth</div>
        <div className="ec-c">A repeat customer has at least two orders marked delivered by Converty.</div></div>
      </div>
      <section className="panel block">
        <div className="p-head"><div><h3>By first delivered month</h3><div className="sub">Repeat behavior over time</div></div></div>
        {cohorts.byMonth.length ? <div className="table-scroll"><table>
          <thead><tr><th>Month</th><th className="num">New customers</th><th className="num">Second delivery</th><th className="num">Third delivery</th><th>Repeat rate</th><th className="num">Revenue</th></tr></thead>
          <tbody>{cohorts.byMonth.map((row) => <tr key={row.monthKey}>
            <td><b>{row.month}</b></td><td className="num">{fmt(row.newCustomers)}</td><td className="num">{fmt(row.second)}</td>
            <td className="num">{fmt(row.third)}</td><td><span className="rrate"><span className="bar"><i style={{ width: `${Math.min(100, Math.max(0, row.repeatPct))}%` }} /></span><span className="pct">{row.repeatPct}%</span></span></td>
            <td className="num">{fmt(row.sales)} TND</td>
          </tr>)}</tbody>
        </table></div> : <div className="empty-state"><h3>No cohort data yet</h3><p>Delivered orders will appear here after your first successful sync.</p></div>}
      </section>
    </div>
  </div>;
}
