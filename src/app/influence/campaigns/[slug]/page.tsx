import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign } from "@/lib/studio";
import AddInfluencerModal from "@/components/studio/AddInfluencerModal";
import CampaignPayoutPanel from "@/components/studio/CampaignPayoutPanel";
import { fmt, resultChip, stateChip, platformLabel } from "@/lib/format";

const TND = () => (
  <span className="muted" style={{ fontWeight: 600, fontSize: "11px" }}>
    TND
  </span>
);

const TrackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
    <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
  </svg>
);

const CheckSm = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data;
  try {
    data = await getCampaign(slug);
  } catch (err) {
    if (err instanceof Error && "status" in err && err.status === 404) notFound();
    throw err;
  }
  const { campaign: c, totals, influencers } = data;
  const st = stateChip(c.state);

  const toPay = influencers.reduce((s, i) => s + i.toPay, 0);
  const toPayList = influencers.filter((i) => i.toPay > 0).sort((a, b) => b.toPay - a.toPay);

  const meta = [
    { label: "Budget", value: c.budget ? `${fmt(c.budget)} TND` : "—" },
    { label: "Customer discount", value: c.customerDiscountPct ? `−${c.customerDiscountPct}%` : "—" },
    { label: "Commission", value: `${c.commissionPct}%` },
    { label: "Duration", value: c.durationLabel || "—" },
    { label: "Goal", value: c.goal },
  ];

  const topInf = [...influencers].sort((a, b) => b.delivered - a.delivered)[0];
  const worstInf = [...influencers].filter((i) => i.delivered > 0).sort((a, b) => a.deliveredPct - b.deliveredPct)[0];

  return (
    <>
      <header className="topbar">
        <div>
          <div className="crumb">
            <Link href="/influence">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 6l-6 6 6 6" />
              </svg>
              Influencer campaigns
            </Link>
            <span style={{ color: "var(--text-tertiary)" }}>/</span> {c.name}
          </div>
          <h1>{c.name}</h1>
        </div>
        <div className="tb-actions">
          <Link className="btn btn-secondary" href="/campaigns">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 13l13-9-3 17-4-5-6-3z" />
            </svg>
            Create similar campaign
          </Link>
          <AddInfluencerModal campaignSlug={slug} triggerClassName="btn btn-primary" />
        </div>
      </header>

      <div className="content">
        {/* CAMPAIGN HERO */}
        <div className="cmp-hero" data-screen-label="Campaign header">
          <div className="top">
            <div>
              <div className="cmp-title">
                <span className="nm">{c.name}</span>
                <span className="chip-i c-pr">
                  <span className="dot" style={{ background: st.dot }}></span>
                  {st.label}
                </span>
              </div>
              <div className="cmp-explain">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8h.01M11 12h1v4h1" />
                </svg>
                Commissions are calculated only after orders are delivered and paid.
              </div>
            </div>
            <div className="valbadge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4" />
                <path d="M12 3l7 3v5c0 4.4-3 8.2-7 9.4C8 19.2 5 15.4 5 11V6z" />
              </svg>
              <span>
                Delivered &amp; cash collected
                <span className="vsub">Source of truth for payouts</span>
              </span>
            </div>
          </div>
          <div className="cmp-meta">
            {meta.map((m) => (
              <div className="m" key={m.label}>
                <div className="ml">{m.label}</div>
                <div className="mv">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI ROW */}
        <div className="kpi-row block" data-screen-label="KPIs">
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
              {fmt(totals.earned)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Sales from delivered orders</div>
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
              {fmt(totals.spent)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Commissions &amp; customer discounts</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--bg-sunken)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                  <path d="M5 7h14l-1 13H6zM9 7V5a3 3 0 016 0v2" />
                </svg>
              </span>
              <span className="k-label">Orders placed</span>
            </div>
            <div className="k-val">{fmt(totals.placed)}</div>
            <div className="k-foot">All orders using a code</div>
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
            <div className="k-val">{fmt(totals.delivered)}</div>
            <div className="k-foot">
              <span className="trend up">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 15l7-7 7 7" />
                </svg>
                {totals.deliveredPct}%
              </span>{" "}
              delivered &amp; paid
            </div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--warn-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="k-label">To pay</span>
            </div>
            <div className="k-val">
              {fmt(toPay)}<span className="u">TND</span>
            </div>
            <div className="k-foot">
              <span className="chip-i c-pay" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                To pay
              </span>{" "}
              {toPayList.length} influencer{toPayList.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* INFLUENCER TABLE */}
        <div className="block" data-screen-label="Influencer table">
          <div className="block-head">
            <div>
              <h2>Influencers in this campaign</h2>
              <div className="sub">
                The gap between orders placed and delivered orders is the COD reality — only delivered
                &amp; paid orders earn commission
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
                  <th>Influencer</th>
                  <th>Code &amp; link</th>
                  <th className="num">Orders placed</th>
                  <th className="num">Delivered orders</th>
                  <th className="num">Earned</th>
                  <th className="num">To pay</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {influencers.map((inf) => {
                  const res = resultChip(inf.result.level, inf.result.label);
                  return (
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
                        <br />
                        <span className="track">
                          <TrackIcon />
                          {inf.link}
                        </span>
                      </td>
                      <td className="num muted" style={{ fontSize: "14px" }}>
                        {inf.placed}
                      </td>
                      <td className="num">
                        <div className="deliv">
                          <span className="dv">{inf.delivered}</span>
                          <div className="bar">
                            <i style={{ width: `${inf.deliveredPct}%` }}></i>
                          </div>
                          <span className="frac">{inf.deliveredPct}% delivered</span>
                        </div>
                      </td>
                      <td className="num">
                        {fmt(inf.earned)} <TND />
                      </td>
                      <td className="num">
                        {inf.paid ? (
                          <span className="chip-i c-paid">
                            <CheckSm />
                            Paid
                          </span>
                        ) : (
                          <div className="paycell">
                            <span className="amt">{fmt(inf.toPay)} TND</span>
                          </div>
                        )}
                      </td>
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
              <b>{fmt(totals.placed)} orders placed → {fmt(totals.delivered)} delivered &amp; paid.</b> The gap never
              earns commission — that is the cash-on-delivery reality Fidely tracks for you. Totals:{" "}
              {fmt(totals.earned)} TND earned · {fmt(toPay)} TND still to pay.
            </div>
          </div>
        </div>

        {/* INSIGHTS + ACTIONS */}
        <div className="block grid-12" data-screen-label="Campaign insights">
          <div className="panel span7">
            <div className="p-head">
              <div>
                <h3>Campaign insights</h3>
                <div className="sub">What the numbers are telling you</div>
              </div>
            </div>
            <div className="ins-list">
              {topInf && (
                <div className="ins-row">
                  <span className="ins-ic" style={{ background: "var(--pos-bg)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                      <path d="M4 18l5-5 4 3 7-8" />
                      <path d="M16 7h5v5" />
                    </svg>
                  </span>
                  <div className="ins-tx">
                    <b>{topInf.handle} drives most delivered orders.</b>
                    <div className="sub">
                      {topInf.delivered} of the campaign&apos;s {totals.delivered} delivered orders come from
                      their code alone.
                    </div>
                  </div>
                </div>
              )}
              {worstInf && worstInf.deliveredPct < 55 && (
                <div className="ins-row">
                  <span className="ins-ic" style={{ background: "var(--warn-bg)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                      <path d="M12 9v4M12 17h.01" />
                      <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
                    </svg>
                  </span>
                  <div className="ins-tx">
                    <b>{worstInf.handle} has low delivery conversion — watch closely.</b>
                    <div className="sub">
                      Only {worstInf.delivered} of {worstInf.placed} placed orders ({worstInf.deliveredPct}%) were
                      delivered &amp; paid. Worth checking their audience or offer.
                    </div>
                  </div>
                </div>
              )}
              <div className="ins-row">
                <span className="ins-ic" style={{ background: "var(--warn-bg)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div className="ins-tx">
                  <b>{fmt(toPay)} TND remains to pay across {toPayList.length} influencer{toPayList.length === 1 ? "" : "s"}.</b>
                  <div className="sub">
                    {toPayList.slice(0, 2).map((i) => `${i.handle} ${fmt(i.toPay)} TND`).join(" and ") || "All commissions are settled."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel span5">
            <div className="p-head">
              <div>
                <h3>Quick actions</h3>
                <div className="sub">Move the campaign forward</div>
              </div>
            </div>
            <CampaignPayoutPanel
              slug={slug}
              budget={c.budget || 0}
              toPayTotal={toPay}
              toPayList={toPayList.map((i) => ({ id: i.id, handle: i.handle, toPay: i.toPay, paid: i.paid }))}
            />
            <div className="qa-actions" style={{ marginTop: 12 }}>
              <Link className="btn btn-secondary" href="/campaigns">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 13l13-9-3 17-4-5-6-3z" />
                </svg>
                Create similar campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
