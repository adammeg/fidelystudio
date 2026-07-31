import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import AddInfluencerModal from "@/components/studio/AddInfluencerModal";
import MarkAsPaidButton from "@/components/studio/MarkAsPaidButton";
import { getCampaigns, getInfluencers } from "@/lib/studio";
import { fmt, resultChip, stateChip, platformLabel } from "@/lib/format";

const TND = () => (
  <span className="muted" style={{ fontWeight: 600, fontSize: "11px" }}>
    TND
  </span>
);

export default async function InfluencerCampaignsPage() {
  const [{ campaigns }, { influencers }] = await Promise.all([getCampaigns(), getInfluencers()]);
  const influencerCampaigns = campaigns.filter((c) => c.type === "influencer");

  const active = influencerCampaigns.filter((c) => c.state === "active").length;
  const finished = influencerCampaigns.filter((c) => c.state === "finished").length;
  const scheduled = influencerCampaigns.filter((c) => c.state === "scheduled").length;
  const delivered = influencers.reduce((s, i) => s + i.delivered, 0);
  const earned = influencers.reduce((s, i) => s + i.earned, 0);
  const spent = influencers.reduce((s, i) => s + i.commission, 0);
  const toPay = influencers.reduce((s, i) => s + i.toPay, 0);
  const toPayCount = influencers.filter((i) => i.toPay > 0).length;

  const influenceTabs = [
    { label: "Influencer campaigns", href: "/influence", count: active },
    { label: "Customer referral", href: "/influence/referral" },
  ];

  const topInfluencers = influencers.slice(0, 6);
  const topCampaign = influencerCampaigns.find((c) => c.state === "active") || influencerCampaigns[0];

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb detail="Orders & COD statuses synced" className="crumb" />
          <h1>Influence &amp; Referral</h1>
          <div className="subt">
            Track influencer sales, delivered orders, and commissions from one place.
          </div>
        </div>
        <div className="tb-actions">
          <AddInfluencerModal />
          <Link className="btn btn-primary" href="/campaigns?type=influencer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 11l16-7-3 16-5-5-5 2z" />
            </svg>
            Create influencer campaign
          </Link>
        </div>
      </header>

      <Tabbar tabs={influenceTabs} />

      <div className="content">
        {/* KPI ROW */}
        <div className="kpi-row" data-screen-label="KPIs">
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <path d="M3 11l16-7-3 16-5-5-5 2z" />
                </svg>
              </span>
              <span className="k-label">Active campaigns</span>
            </div>
            <div className="k-val">{active}</div>
            <div className="k-foot">{finished} finished · {scheduled} scheduled</div>
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
            <div className="k-val">{fmt(delivered)}</div>
            <div className="k-foot">Delivered &amp; paid via influencers</div>
          </div>
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
              {fmt(earned)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Delivered &amp; paid via influencers</div>
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
              {fmt(spent)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Commissions &amp; customer discounts</div>
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
              {fmt(toPay)}<span className="u">TND</span>
            </div>
            <div className="k-foot">
              <span className="chip-i c-pay" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                To pay
              </span>{" "}
              {toPayCount} influencer{toPayCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* CAMPAIGNS TABLE */}
        <div className="block" data-screen-label="Campaigns table">
          <div className="block-head">
            <div>
              <h2>Influencer campaigns</h2>
              <div className="sub">
                Commissions count only after orders are delivered &amp; cash collected
              </div>
            </div>
            <div className="tnote">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Validated: delivered &amp; cash collected
            </div>
          </div>
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>State</th>
                  <th>Influencers</th>
                  <th className="num">Orders placed</th>
                  <th className="num">Delivered orders</th>
                  <th className="num">Earned</th>
                  <th className="num">Spent</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {influencerCampaigns.map((c) => {
                  const st = stateChip(c.state);
                  const res = resultChip(c.result.level, c.result.label);
                  return (
                    <tr key={c.id} className="clickable">
                      <td>
                        <span className="cmp-name">
                          <Link href={`/influence/campaigns/${c.slug}`}>{c.name}</Link>{" "}
                          <span className="tag-mini">{c.type}</span>
                        </span>
                      </td>
                      <td>
                        <span className="lc">
                          <span className="dot" style={{ background: st.dot }}></span>
                          {st.label}
                        </span>
                        <div className="lc-sub">{c.durationLabel || "—"}</div>
                      </td>
                      <td>
                        <div className="inf-cell">
                          <span className="avstack">
                            {c.influencers.slice(0, 4).map((a) => (
                              <span key={a.id} className="a" style={{ background: a.avatarBg }}>
                                {a.initial}
                              </span>
                            ))}
                          </span>
                          <span className="inf-count">{c.influencers.length}</span>
                        </div>
                      </td>
                      {c.placed ? (
                        <td className="num muted" style={{ fontSize: "13.5px" }}>
                          {c.placed}
                        </td>
                      ) : (
                        <td className="num muted">—</td>
                      )}
                      {c.delivered ? (
                        <td className="num">
                          <div className="deliv">
                            <span className="dv">{c.delivered}</span>
                            <div className="bar">
                              <i style={{ width: `${c.deliveredPct}%` }}></i>
                            </div>
                            <span className="frac">{c.deliveredPct}% delivered</span>
                          </div>
                        </td>
                      ) : (
                        <td className="num muted">—</td>
                      )}
                      {c.earned ? (
                        <td className="num">
                          {fmt(c.earned)} <TND />
                        </td>
                      ) : (
                        <td className="num muted">—</td>
                      )}
                      {c.spent ? (
                        <td className="num">
                          {fmt(c.spent)} <TND />
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
              <b>Orders placed</b> are all orders from a code; <b>delivered orders</b> are the ones
              actually delivered &amp; paid — only these earn commissions.
            </div>
          </div>
        </div>

        {/* BOTTOM: TOP INFLUENCERS + OPPORTUNITY */}
        <div className="block grid-12" data-screen-label="Top influencers">
          <div className="panel span8">
            <div className="p-head">
              <div>
                <h3>Top influencers this period</h3>
                <div className="sub">{fmt(toPay)} TND in commissions still to pay</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Influencer</th>
                  <th>Code</th>
                  <th className="num">Delivered orders</th>
                  <th className="num">Earned</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {topInfluencers.map((inf) => (
                  <tr key={inf.id}>
                    <td>
                      <div className="who-cell">
                        <span className="av" style={{ background: inf.avatarBg }}>
                          {inf.handle.replace("@", "").charAt(0)}
                        </span>
                        <span>
                          <span className="h">{inf.handle}</span>
                          <br />
                          <span className="p">{platformLabel(inf.platform)}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="code">{inf.code}</span>
                    </td>
                    <td className="num">
                      <div className="deliv">
                        <span className="dv">{inf.delivered}</span>
                        <div className="bar">
                          <i style={{ width: `${inf.deliveredPct}%` }}></i>
                        </div>
                        <span className="frac">of {inf.placed} placed</span>
                      </div>
                    </td>
                    <td className="num">
                      {fmt(inf.earned)} <TND />
                    </td>
                    <td>
                      {inf.paid ? (
                        <span className="chip-i c-paid">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          Paid
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span className="chip-i c-pay">To pay · {fmt(inf.toPay)} TND</span>
                          <MarkAsPaidButton influencerId={inf.id} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="span4">
            <div className="opp" data-screen-label="Opportunity">
              <span className="o-flag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Strongest performer
              </span>
              <div className="o-head">
                <span className="o-av" style={{ background: topInfluencers[0]?.avatarBg || "#C8744F" }}>
                  {topInfluencers[0] ? topInfluencers[0].handle.replace("@", "").charAt(0) : "S"}
                </span>
                <div>
                  <div className="o-metric">{topInfluencers[0]?.handle || "—"}</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {topInfluencers[0] ? `${topInfluencers[0].delivered} delivered · ${fmt(topInfluencers[0].earned)} TND` : "—"}
                  </div>
                </div>
              </div>
              <div className="o-body">
                <b>{topInfluencers[0]?.handle || "Your top influencer"} is your strongest performer.</b> Increasing
                their budget could bring more delivered orders from the channel that already converts best.
              </div>
              <div className="o-cta">
                <Link
                  className="btn btn-primary"
                  href={topCampaign ? `/influence/campaigns/${topCampaign.slug}` : "/influence"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Increase the budget
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
