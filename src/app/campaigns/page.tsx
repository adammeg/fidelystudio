import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import CampaignBuilder, { type SegmentOption } from "@/components/studio/CampaignBuilder";
import { getCampaigns, getSegments } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export default async function CampaignBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; incentive?: string; goal?: string; name?: string; type?: string }>;
}) {
  const [seg, user, sp, existing] = await Promise.all([getSegments(), getSessionUser(), searchParams, getCampaigns()]);
  const c = seg.counts;
  const segments: SegmentOption[] = [
    { key: "closeReward", name: "Close to a reward", rule: "Within reach of their next reward", count: c.closeReward },
    { key: "atRisk", name: "At-risk customers", rule: "No delivered order in the last 60 days", count: c.atRisk },
    { key: "dormant", name: "Dormant customers", rule: "No delivered order in 90+ days", count: c.dormant },
    { key: "vip", name: "VIP customers", rule: "High-value repeat buyers", count: c.vip },
    { key: "influencerAcquired", name: "Influencer-acquired", rule: "First delivered order via influencer code", count: c.influencerAcquired },
    { key: "highBasket", name: "High basket customers", rule: "Above-average delivered order value", count: c.highBasket },
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <ConvertySyncCrumb className="crumb" />
          <h1>Create campaign</h1>
          <div className="subt">
            Choose an audience, offer, channel, and goal — Fidely estimates the likely cost before you launch.
          </div>
        </div>
        <div className="tb-actions">
          <Link className="btn btn-secondary" href="/">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </Link>
        </div>
      </header>

      <div className="content">
        {existing.campaigns.length > 0 && <section className="panel block">
          <div className="p-head"><div><h3>Campaign drafts</h3><div className="sub">Sending remains locked until a messaging provider is connected.</div></div></div>
          <div className="stat-list">{existing.campaigns.map((campaign) => <div className="stat-row" key={campaign.id}>
            <span><b>{campaign.name}</b> · {campaign.state}</span>
            <b>{campaign.eligibleCount} eligible / {campaign.audienceCount} customers</b>
          </div>)}</div>
        </section>}
        {/* STEPPER */}
        <div className="stepper" data-screen-label="Stepper">
          {["Who", "What", "Where", "Goal"].map((lab, i) => (
            <div key={lab} style={{ display: "contents" }}>
              <div className="stp done">
                <span className="num">
                  <Check />
                </span>
                <span className="lab">
                  <span>Step {i + 1}</span>
                  {lab}
                </span>
              </div>
              <div className="stp-line filled"></div>
            </div>
          ))}
          <div className="stp current">
            <span className="num">5</span>
            <span className="lab">
              <span>Step 5</span>Launch check
            </span>
          </div>
        </div>

        <CampaignBuilder
          segments={segments}
          storeName={user.shopName || "Your store"}
          initial={{
            segment: sp.segment,
            incentive: sp.incentive,
            goal: sp.goal,
            name: sp.name,
            type: sp.type,
          }}
        />
      </div>
    </>
  );
}
