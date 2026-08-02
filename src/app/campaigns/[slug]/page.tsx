import Link from "next/link";
import CampaignSender from "@/components/studio/CampaignSender";
import { getCampaign, getWhatsAppStatus } from "@/lib/studio";

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, whatsapp] = await Promise.all([getCampaign(slug), getWhatsAppStatus()]);
  const recipients = (data as typeof data & { recipients?: Record<string, number> }).recipients || {};
  const queued = recipients.queued || 0;
  const excluded = (recipients.excluded_consent || 0) + (recipients.excluded_frequency || 0);
  const canSend = ["draft", "sending"].includes(data.campaign.state);
  return <>
    <header className="topbar"><div><div className="breadcrumb"><Link href="/campaigns">Campaigns</Link><span>/</span><span className="cur">{data.campaign.name}</span></div><h1>{data.campaign.name}</h1><div className="subt">WhatsApp campaign · {data.campaign.state}</div></div><div className="tb-actions"><Link className="btn btn-secondary" href="/campaigns">All campaigns</Link></div></header>
    <div className="content">
      <section className="kpi-row block">{[["Audience", data.campaign.audienceCount], ["Eligible", data.campaign.eligibleCount], ["Sent", (recipients.sent || 0) + (recipients.delivered || 0)], ["Delivered", recipients.delivered || 0], ["Failed", recipients.failed || 0]].map(([label, value]) => <article className="kpi" key={label}><div className="k-label">{label}</div><div className="k-val">{value}</div></article>)}</section>
      <div className="grid-12 block"><section className="panel span8"><div className="p-head"><div><h3>Message</h3><div className="sub">The exact WhatsApp message saved with this campaign</div></div><span className="status-pill">{data.campaign.state}</span></div><div style={{ padding: 18 }}><div className="wa-preview"><div className="wa-bubble" style={{ whiteSpace: "pre-wrap" }}>{data.campaign.message}</div></div></div></section>
      <aside className="panel span4"><div className="p-head"><div><h3>Audience snapshot</h3><div className="sub">Frozen when the campaign was created</div></div></div><div className="stat-list"><div className="stat-row"><span>Queued</span><b>{queued}</b></div><div className="stat-row"><span>Excluded</span><b>{excluded}</b></div><div className="stat-row"><span>No consent</span><b>{recipients.excluded_consent || 0}</b></div><div className="stat-row"><span>Frequency protection</span><b>{recipients.excluded_frequency || 0}</b></div></div><div style={{ padding: 18 }}>{canSend ? <CampaignSender slug={slug} queued={queued} connected={whatsapp.connected} /> : <p className="muted">This campaign is part of your history and can no longer be sent again.</p>}</div></aside></div>
    </div>
  </>;
}
