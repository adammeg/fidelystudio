import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/studio";
import CustomerNotesForm from "@/components/studio/CustomerNotesForm";
import { fmt, initials, tierChip, timeAgo, sourceText } from "@/lib/format";

function shortDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function orderStatus(status: string) {
  if (status === "delivered") return { cls: "c-deliv", dot: "#3E8E5A", label: "Delivered & paid" };
  if (status === "placed") return { cls: "c-nd", dot: "#A99E90", label: "Placed" };
  return { cls: "c-refused", dot: "#C25B4E", label: status.charAt(0).toUpperCase() + status.slice(1) };
}

export default async function Customer360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getCustomer(id);
  } catch (err) {
    if (err instanceof Error && "status" in err && err.status === 404) notFound();
    throw err;
  }
  const { customer, stats, orders, referrals } = data;
  const tier = tierChip(customer.tier);
  const src = sourceText(customer.source);
  const firstName = customer.name.split(" ")[0];
  const rewardedReferrals = referrals.filter((r) => r.status === "rewarded");

  return (
    <>
      <header className="topbar">
        <div>
          <div className="breadcrumb">
            <Link href="/customers">Customers</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <Link href="/customers">All customers</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span className="cur">{customer.name}</span>
          </div>
          <h1>{customer.name}</h1>
          <div className="subt">Customer profile</div>
        </div>
      </header>

      <div className="content">
        {/* PROFILE BAND */}
        <div className="profile-band" data-screen-label="Profile">
          <span className="pav">{initials(customer.name)}</span>
          <div>
            <div className="pname">
              {customer.name}{" "}
              <span className={`chip-i ${tier.cls}`} style={{ fontSize: "11px" }}>
                <span className="dot" style={{ background: tier.dot }}></span>
                {tier.label}
              </span>
            </div>
            <div className="pphone">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 4h4l2 5-3 2a11 11 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
              </svg>
              {customer.phone} · Identified by phone number
            </div>
            <div className="pchips">
              <span className="acq-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 11l16-7-3 16-5-5-5 2z" />
                  <path d="M11 15l5-9" />
                </svg>
                Acquired via {src.s1}
              </span>
              {src.s2 && <span className="acq-chip">{src.s2}</span>}
              <span className="acq-chip">Joined {shortDate(customer.createdAt)}</span>
            </div>
          </div>
          <div className="pright">
            <div className="pl">Last delivered order</div>
            <div className="pv">{timeAgo(customer.lastDeliveredAt)}</div>
          </div>
        </div>

        {/* KPI ROW (6) */}
        <div className="kpi-row six block" data-screen-label="KPIs">
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--bg-sunken)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                  <path d="M12 3v18M7 7h7a3 3 0 010 6H9a3 3 0 000 6h8" />
                </svg>
              </span>
              <span className="k-label">Total spent</span>
            </div>
            <div className="k-val">
              {fmt(stats.spent)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Across delivered orders</div>
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
            <div className="k-val">{stats.placed}</div>
            <div className="k-foot">{stats.delivered} delivered · {stats.refused} refused</div>
          </div>
          <div className="kpi kpos feature">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M3 7h13l2 4h3v6H3z" />
                  <circle cx="7" cy="18" r="1.8" />
                  <circle cx="17" cy="18" r="1.8" />
                </svg>
              </span>
              <span className="k-label">Delivered orders</span>
            </div>
            <div className="k-val">{stats.delivered}</div>
            <div className="k-foot">Delivered &amp; paid · of {stats.placed} placed</div>
          </div>
          <div className="kpi kwarn">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--risk-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C25B4E">
                  <path d="M3 7h13l2 4h3v6H3z" />
                  <path d="M9 13l4 4M13 13l-4 4" />
                </svg>
              </span>
              <span className="k-label">Refused / returned</span>
            </div>
            <div className="k-val">{stats.refused}</div>
            <div className="k-foot">Did not earn points</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                </svg>
              </span>
              <span className="k-label">Points available</span>
            </div>
            <div className="k-val">{fmt(customer.points)}</div>
            <div className="k-foot">Earned on delivered orders</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--bg-sunken)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                  <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 8h20v4H2zM12 8v12" />
                </svg>
              </span>
              <span className="k-label">Referrals sent</span>
            </div>
            <div className="k-val">{referrals.length}</div>
            <div className="k-foot">{rewardedReferrals.length} rewarded</div>
          </div>
        </div>

        {/* BODY */}
        <div className="block grid-12">
          {/* LEFT */}
          <div className="span8">
            {/* Order history */}
            <div className="panel" data-screen-label="Order history">
              <div className="p-head">
                <div>
                  <h3>Order history</h3>
                  <div className="sub">
                    Placed vs delivered — only delivered &amp; paid orders earn points
                  </div>
                </div>
                <div className="tnote">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Delivered &amp; paid = source of truth
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th>Source</th>
                    <th className="num">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const st = orderStatus(o.status);
                    const delivered = o.status === "delivered";
                    return (
                      <tr key={o.id}>
                        <td className="muted">{shortDate(o.placedAt)}</td>
                        <td style={{ fontWeight: 700 }}>{o.reference || "—"}</td>
                        <td>
                          <span className={`chip-i ${st.cls}`}>
                            <span className="dot" style={{ background: st.dot }}></span>
                            {st.label}
                          </span>
                        </td>
                        <td className={`num${delivered ? "" : " muted"}`}>{fmt(o.amount)} TND</td>
                        <td>
                          {o.source?.code ? (
                            <span className="code">{o.source.code}</span>
                          ) : (
                            <span className="muted" style={{ textTransform: "capitalize" }}>{o.source?.type || "organic"}</span>
                          )}
                        </td>
                        <td className={`num${delivered ? "" : " muted"}`} style={delivered ? { color: "var(--pos-fg)" } : undefined}>
                          {delivered ? `+${o.pointsEarned}` : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tbl-foot">
                Refused or returned orders do not count toward points or status. Points are credited only after
                delivered &amp; paid orders.
              </div>
            </div>

            {/* Points & loyalty */}
            <div className="panel" style={{ marginTop: "16px" }} data-screen-label="Points activity">
              <div className="p-head">
                <div>
                  <h3>Points &amp; loyalty activity</h3>
                  <div className="sub">A simple ledger of every point movement</div>
                </div>
              </div>
              <div className="ledger">
                <div className="led-bal">
                  <span className="n">{fmt(customer.points)}</span>
                  <span className="u">points available</span>
                  <span className="lab">Current balance</span>
                </div>
                {orders
                  .filter((o) => o.status === "delivered")
                  .slice(0, 8)
                  .map((o) => (
                    <div className="led-row" key={o.id}>
                      <span className="led-ic" style={{ background: "var(--pos-bg)" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                      <div className="led-tx">
                        Delivered order {o.reference || ""}
                        <div className="s">{shortDate(o.deliveredAt)} · {fmt(o.amount)} TND delivered &amp; paid</div>
                      </div>
                      <span className="led-amt pos">+{o.pointsEarned}</span>
                    </div>
                  ))}
              </div>
              <div className="tbl-foot">Points are added only after delivered &amp; paid orders.</div>
            </div>

            {/* Referral activity */}
            <div className="panel" style={{ marginTop: "16px" }} data-screen-label="Referral activity">
              <div className="p-head">
                <div>
                  <h3>Referral activity</h3>
                  <div className="sub">Whether this customer has brought friends</div>
                </div>
              </div>
              <div className="ref-trio">
                <div className="ref-stat">
                  <div className="n">{referrals.length}</div>
                  <div className="l">Referrals sent</div>
                </div>
                <div className="ref-stat">
                  <div className="n">{rewardedReferrals.length}</div>
                  <div className="l">Friends with delivered orders</div>
                </div>
                <div className="ref-stat">
                  <div className="n">{rewardedReferrals.length * 10} TND</div>
                  <div className="l">Referral rewards earned</div>
                </div>
              </div>
              <div className="tbl-foot" style={{ background: "none", borderTop: "1px solid var(--border)" }}>
                {referrals.length === 0
                  ? "This customer has never referred a friend yet."
                  : `This customer has referred ${referrals.length} friend${referrals.length === 1 ? "" : "s"}.`}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="span4">
            {/* Recommended action */}
            <div className="rec-panel" data-screen-label="Recommended action">
              <div className="rec-head">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                </svg>
                Recommended action
              </div>
              <div className="rec-body">
                <div className="rec-title">Turn {firstName} into a referrer</div>
                <div className="rec-reason">
                  {stats.delivered} delivered order{stats.delivered === 1 ? "" : "s"}
                  {referrals.length === 0 ? ", and hasn't referred a friend yet." : "."}
                </div>
                <div className="rec-suggest">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Suggested: send a WhatsApp referral offer
                </div>
                <div className="wa-preview" style={{ padding: "14px" }}>
                  <div className="wa-bubble">
                    Salem {firstName}, invite a friend. They get <b>10 TND off</b> their first order, and you get{" "}
                    <b>10 TND</b> after their first delivered order.
                  </div>
                  <div className="wa-meta">
                    via WhatsApp · preview
                    <svg viewBox="0 0 24 24" fill="none" stroke="#34B7F1" strokeWidth="3">
                      <path d="M2 13l4 4L13 7" />
                      <path d="M10 13l4 4L22 7" />
                    </svg>
                  </div>
                </div>
                <div className="rec-cta">
                  <Link
                    className="btn btn-primary"
                    href={`/campaigns?segment=influencerAcquired&goal=Referral&name=${encodeURIComponent(`Referral offer for ${firstName}`)}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                    </svg>
                    Send WhatsApp offer
                  </Link>
                  <Link className="btn btn-secondary" href="/campaigns">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Create campaign
                  </Link>
                </div>
              </div>
            </div>

            {/* Tags / notes */}
            <div className="panel" style={{ marginTop: "16px" }} data-screen-label="Tags and notes">
              <div className="p-head">
                <div>
                  <h3>Tags &amp; notes</h3>
                </div>
              </div>
              <div style={{ padding: "14px 18px 16px" }}>
                <div className="tag-wrap">
                  <span className="tag-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 11l16-7-3 16-5-5-5 2z" />
                    </svg>
                    {src.s1}
                  </span>
                  <span className="tag-pill">{stats.delivered} delivered orders</span>
                  {referrals.length === 0 && <span className="tag-pill">No referrals yet</span>}
                  <span className="tag-pill" style={{ textTransform: "capitalize" }}>{tier.label}</span>
                  {customer.tags.map((t) => (
                    <span className="tag-pill" key={t}>{t}</span>
                  ))}
                </div>
                <CustomerNotesForm customerId={customer.id} initialNote={customer.note} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
