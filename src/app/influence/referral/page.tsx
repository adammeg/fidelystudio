import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import ReferralForm from "@/components/studio/ReferralForm";
import { getReferral } from "@/lib/studio";
import { getSessionUser } from "@/lib/session";
import { fmt } from "@/lib/format";

const influenceTabs = [
  { label: "Influencer campaigns", href: "/influence" },
  { label: "Customer referral", href: "/influence/referral" },
];

export default async function CustomerReferralPage() {
  const [{ program, stats }, user] = await Promise.all([getReferral(), getSessionUser()]);
  const storeName = user.shopName || "Your store";

  const rewardsSpent = stats.rewarded * (program.friendReward.value + program.referrerReward.value);
  const pendingRewards = stats.pending * program.referrerReward.value;

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb detail="Orders & COD statuses synced" className="crumb" />
          <h1>Influence &amp; Referral</h1>
          <div className="subt">
            Your always-on referral program. Customers invite friends, both sides are rewarded after a
            delivered &amp; paid order.
          </div>
        </div>
        <div className="tb-actions">
          <span className="live-chip">
            <span className="ld"></span>Program {program.enabled ? "live" : "paused"}
          </span>
        </div>
      </header>

      <Tabbar tabs={influenceTabs} />

      <div className="content">
        {/* PERFORMANCE SUMMARY */}
        <div className="block-head" style={{ marginBottom: "14px" }}>
          <div>
            <h2>Referral program performance</h2>
            <div className="sub">Since launch · your evergreen customer referral program</div>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Validated on delivered &amp; paid orders
          </span>
        </div>
        <div className="kpi-row" data-screen-label="Referral performance">
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "#F0E7DD" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7C5A43">
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
                  <path d="M16 11l2 2 4-4" />
                </svg>
              </span>
              <span className="k-label">Referral customers acquired</span>
            </div>
            <div className="k-val">{fmt(stats.rewarded)}</div>
            <div className="k-foot">First delivered order via referral</div>
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
              <span className="k-label">Delivered referral orders</span>
            </div>
            <div className="k-val">{fmt(stats.deliveredOrders)}</div>
            <div className="k-foot">Delivered &amp; paid</div>
          </div>
          <div className="kpi feature">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--pos-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A">
                  <path d="M4 18l5-5 4 3 7-8" />
                  <path d="M16 7h5v5" />
                </svg>
              </span>
              <span className="k-label">Earned from referral</span>
            </div>
            <div className="k-val">
              {fmt(stats.revenue)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Delivered &amp; paid referral orders</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--bg-sunken)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                  <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 8h20v4H2zM12 8v12" />
                </svg>
              </span>
              <span className="k-label">Rewards spent</span>
            </div>
            <div className="k-val">
              {fmt(rewardsSpent)}<span className="u">TND</span>
            </div>
            <div className="k-foot">Credited to both sides</div>
          </div>
          <div className="kpi">
            <div className="k-top">
              <span className="k-ic" style={{ background: "var(--warn-bg)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#C98A2B">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="k-label">Pending rewards</span>
            </div>
            <div className="k-val">
              {fmt(pendingRewards)}<span className="u">TND</span>
            </div>
            <div className="k-foot">
              <span className="chip-i c-aw" style={{ padding: "2px 8px", fontSize: "10.5px" }}>
                Awaiting delivery
              </span>
            </div>
          </div>
        </div>

        {/* PROGRAM SETTINGS (interactive) */}
        <div className="block">
          <ReferralForm program={program} storeName={storeName} />
        </div>
      </div>
    </div>
  );
}
