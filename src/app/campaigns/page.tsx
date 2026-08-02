import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import CampaignBuilder, { type SegmentOption } from "@/components/studio/CampaignBuilder";
import { getCampaigns, getSegments, type ApiCampaign } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";
import Link from "next/link";

const stateMeta: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "" }, sending: { label: "Sending", cls: "live" },
  sent: { label: "Completed", cls: "live" }, completed: { label: "Completed", cls: "live" },
  cancelled: { label: "Cancelled", cls: "" }, scheduled: { label: "Scheduled", cls: "cod" },
};
function CampaignRows({ campaigns, empty }: { campaigns: ApiCampaign[]; empty: string }) {
  if (!campaigns.length) return <div className="empty-state"><h3>{empty}</h3><p>Campaigns in this stage will appear here.</p></div>;
  return <div>{campaigns.map((campaign) => {
    const meta = stateMeta[campaign.state] || { label: campaign.state, cls: "" }; return <Link className="ch-row campaign-history-link" href={`/campaigns/${campaign.slug}`} key={campaign.id}>
      <span className="ch-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 13l13-9-3 17-4-5-6-3z" /></svg></span>
      <span><span className="ch-nm">{campaign.name}</span><span className="ch-sub">WhatsApp · {campaign.goal} · {campaign.eligibleCount} eligible customers{campaign.createdAt ? ` · ${new Date(campaign.createdAt).toLocaleDateString("en-GB")}` : ""}</span></span>
      <span className={`status-pill ${meta.cls}`}>{meta.label}</span><span className="campaign-open">View →</span>
    </Link>;
  })}</div>;
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ view?: string; segment?: string; incentive?: string; goal?: string; name?: string; type?: string }> }) {
  const sp = await searchParams;
  const [{ campaigns }, seg, user] = await Promise.all([getCampaigns(), getSegments(), getSessionUser()]);
  if (sp.view === "create") {
    const c = seg.counts;
    const segments: SegmentOption[] = [
      { key: "closeReward", name: "Close to a reward", rule: "Within reach of their next reward", count: c.closeReward },
      { key: "atRisk", name: "At-risk customers", rule: "No delivered order in the last 60 days", count: c.atRisk },
      { key: "dormant", name: "Dormant customers", rule: "No delivered order in 90+ days", count: c.dormant },
      { key: "vip", name: "VIP customers", rule: "High-value repeat buyers", count: c.vip },
      { key: "influencerAcquired", name: "Influencer-acquired", rule: "First delivered order via influencer code", count: c.influencerAcquired },
      { key: "highBasket", name: "High basket customers", rule: "Above-average delivered order value", count: c.highBasket },
    ];
    return <><header className="topbar"><div><div className="breadcrumb"><Link href="/campaigns">Campaigns</Link><span>/</span><span className="cur">New campaign</span></div><h1>Create WhatsApp campaign</h1><div className="subt">Choose the audience and reward, then review the eligible recipients before sending.</div></div><div className="tb-actions"><Link className="btn btn-secondary" href="/campaigns">Cancel</Link></div></header><div className="content"><CampaignBuilder segments={segments} storeName={user.shopName || "Your store"} initial={sp} /></div></>;
  }
  const drafts = campaigns.filter((campaign) => campaign.state === "draft");
  const active = campaigns.filter((campaign) => ["sending", "scheduled"].includes(campaign.state));
  const history = campaigns.filter((campaign) => ["sent", "completed", "cancelled"].includes(campaign.state));
  return <><header className="topbar"><div><ConvertySyncCrumb className="crumb" /><h1>Campaigns</h1><div className="subt">Create, resume, and review every WhatsApp campaign from one place.</div></div><div className="tb-actions"><Link className="btn btn-primary" href="/campaigns?view=create">Create campaign</Link></div></header>
    <div className="content"><section className="kpi-row block">{[["All campaigns", campaigns.length], ["Drafts", drafts.length], ["In progress", active.length], ["Campaign history", history.length]].map(([label, value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      <div className="campaign-library"><section className="panel"><div className="p-head"><div><h3>Drafts</h3><div className="sub">Campaigns waiting for review or launch</div></div></div><CampaignRows campaigns={drafts} empty="No campaign drafts" /></section>
        <section className="panel"><div className="p-head"><div><h3>In progress</h3><div className="sub">Scheduled campaigns and messages currently sending</div></div></div><CampaignRows campaigns={active} empty="No active campaigns" /></section>
        <section className="panel campaign-history"><div className="p-head"><div><h3>Campaign history</h3><div className="sub">Completed and cancelled campaigns remain available for consultation</div></div></div><CampaignRows campaigns={history} empty="No old campaigns yet" /></section></div>
    </div></>;
}
