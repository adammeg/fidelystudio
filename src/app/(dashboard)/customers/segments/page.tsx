import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getSegments } from "@/lib/studio";
import { fmt } from "@/lib/format";

export default async function SegmentsPage() {
  const { counts, storeAvgBasket, currency } = await getSegments();
  const segments = [
    { key: "vip", name: "VIP customers", count: counts.vip, rule: `At least 2 delivered orders and 1,000 ${currency} in delivered revenue.` },
    { key: "atRisk", name: "At-risk customers", count: counts.atRisk, rule: "Last delivered order was 60–89 days ago." },
    { key: "dormant", name: "Dormant customers", count: counts.dormant, rule: "Last delivered order was at least 90 days ago." },
    { key: "highBasket", name: "High basket customers", count: counts.highBasket, rule: `Average delivered basket is above the store average of ${fmt(storeAvgBasket)} ${currency}.` },
    { key: "closeReward", name: "Close to a reward", count: counts.closeReward, rule: "Currently has between 70 and 99 loyalty points." },
    { key: "influencerAcquired", name: "Influencer-acquired", count: counts.influencerAcquired, rule: "Customer was first acquired through an influencer source." },
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
        <div className="ec-c">Segments update from delivered orders and loyalty activity. A customer can belong to more than one segment and each segment can be selected when creating a WhatsApp campaign.</div></div>
      </div>
      <section className="seg-grid block">
        {segments.map((segment) => <article className="segc" key={segment.name}>
          <div className="s-name">{segment.name}</div>
          <div className="s-rule">{segment.rule}</div>
          <div className="s-count">{fmt(segment.count)} <span className="u">customers</span></div>
          <Link href={`/customers?segment=${segment.key}`} className="btn btn-secondary">Explore customers</Link>
        </article>)}
      </section>
    </div>
  </div>;
}
