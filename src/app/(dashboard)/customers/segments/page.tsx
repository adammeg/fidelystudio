import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getSegments } from "@/lib/studio";
import { fmt } from "@/lib/format";

export default async function SegmentsPage() {
  const { counts, storeAvgBasket } = await getSegments();
  const segments = [
    { name: "VIP customers", count: counts.vip, rule: "High-value repeat buyers with several delivered orders." },
    { name: "At-risk customers", count: counts.atRisk, rule: "No delivered order in the last 60 days." },
    { name: "Dormant customers", count: counts.dormant, rule: "Bought before, but no delivered order in 90 days." },
    { name: "High basket customers", count: counts.highBasket, rule: `Average delivered basket is above the store average of ${fmt(storeAvgBasket)} TND.` },
  ];
  const tabs = [
    { label: "Segments", href: "/customers/segments", count: segments.length },
    { label: "All customers", href: "/customers" },
    { label: "Cohorts", href: "/customers/cohorts" },
  ];
  return <div className="has-tabbar">
    <header className="topbar"><div><ConvertySyncCrumb className="crumb" /><h1>Customer segments</h1>
      <div className="subt">Transparent groups calculated only from delivered order behavior.</div></div>
    </header>
    <Tabbar tabs={tabs} />
    <div className="content">
      <div className="explain-card"><div><div className="ec-t">Every segment has a visible rule</div>
        <div className="ec-c">These are analytics views, not messaging audiences. Campaign delivery is intentionally unavailable for now.</div></div>
      </div>
      <section className="seg-grid block">
        {segments.map((segment) => <article className="segc" key={segment.name}>
          <div className="s-name">{segment.name}</div>
          <div className="s-rule">{segment.rule}</div>
          <div className="s-count">{fmt(segment.count)} <span className="u">customers</span></div>
          <Link href="/customers" className="btn btn-secondary">Explore customers</Link>
        </article>)}
      </section>
    </div>
  </div>;
}
