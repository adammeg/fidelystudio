import Link from "next/link";
import Tabbar from "@/components/Tabbar";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getSegments } from "@/lib/studio";
import { fmt } from "@/lib/format";

function segIcon(icon: string) {
  switch (icon) {
    case "crown":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
        </svg>
      );
    case "moon":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      );
    case "bag":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M6 7h12l1 13H5zM9 7a3 3 0 016 0" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
        </svg>
      );
    case "network":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
        </svg>
      );
    case "megaphone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1z" />
          <path d="M16 9a4 4 0 010 6" />
        </svg>
      );
    default:
      return null;
  }
}

export default async function CustomerSegmentsPage() {
  const seg = await getSegments();
  const c = seg.counts;

  const segments = [
    { key: "vip", name: "VIP customers", icon: "crown", count: c.vip, rule: "High-value repeat buyers with several delivered orders.", rec: "Reward loyalty with an exclusive VIP perk" },
    { key: "atRisk", name: "At-risk customers", icon: "warning", count: c.atRisk, rule: "No delivered order in the last 60 days.", rec: "Send a WhatsApp comeback offer" },
    { key: "dormant", name: "Dormant customers", icon: "moon", count: c.dormant, rule: "Bought before, no delivered order in 90+ days.", rec: "Launch a reactivation campaign" },
    { key: "highBasket", name: "High basket customers", icon: "bag", count: c.highBasket, rule: `Average delivered order above store average (${fmt(seg.storeAvgBasket)} TND).`, rec: "Offer premium rewards instead of discounts" },
    { key: "closeReward", name: "Close to a reward", icon: "star", count: c.closeReward, rule: "Within reach of their next reward.", rec: "Launch a double-points weekend" },
    { key: "referralChampions", name: "Referral champions", icon: "network", count: c.referralChampions, rule: "Referred at least 2 friends with delivered orders.", rec: "Give them a stronger referral perk" },
    { key: "influencerAcquired", name: "Influencer-acquired", icon: "megaphone", count: c.influencerAcquired, rule: "First delivered order came from an influencer code.", rec: "Turn them into referrers with a WhatsApp offer" },
  ];

  const customersTabs = [
    { label: "Segments", href: "/customers/segments", count: segments.length },
    { label: "All customers", href: "/customers" },
    { label: "Cohorts", href: "/customers/cohorts" },
  ];

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb className="crumb" />
          <h1>Customers</h1>
          <div className="subt">
            Understand who is buying, who is coming back, and who needs an action.
          </div>
        </div>
        <div className="tb-actions">
          <form className="search" action="/customers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input name="q" placeholder="Search by phone or name" />
          </form>
        </div>
      </header>

      <Tabbar tabs={customersTabs} />

      <div className="content">
        <div className="block" data-screen-label="Segments to activate">
          <div className="block-head">
            <div>
              <h2>Segments to activate</h2>
              <div className="sub">
                Each group is a plain rule on delivered orders. Pick one and launch a campaign to it.
              </div>
            </div>
          </div>

          <div className="seg-grid">
            {segments.map((s) => (
              <div className="segc" key={s.key}>
                <div className="s-name">
                  <span className="tag">{segIcon(s.icon)}</span>
                  {s.name}
                </div>
                <div className="s-rule">{s.rule}</div>
                <div className="s-count">
                  {fmt(s.count)}
                  <span className="u">customers</span>
                </div>
                <div className="rec">
                  <span className="ri">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                    </svg>
                  </span>
                  <div>
                    <div className="rl">Recommended action</div>
                    <div className="rt">{s.rec}</div>
                  </div>
                </div>
                <Link
                  className="btn btn-primary"
                  href={`/campaigns?segment=${s.key}&name=${encodeURIComponent(s.name)}&goal=${encodeURIComponent(s.key === "influencerAcquired" ? "Referral" : s.key === "atRisk" || s.key === "dormant" ? "Reactivation" : "Repeat purchase")}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create a campaign
                </Link>
              </div>
            ))}

            {/* Best opportunity this week */}
            <div className="best-opp" data-screen-label="Best opportunity">
              <div className="bo-main">
                <span className="bo-flag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
                  </svg>
                  Best opportunity this week
                </span>
                <div className="bo-head">
                  <span className="bo-num">{fmt(c.closeReward)}</span>
                  <span className="bo-num-lab">customers close to a reward</span>
                </div>
                <div className="bo-text">
                  A <b>double-points weekend</b> could bring their next delivered order — they only need a
                  small nudge to cross the line.
                </div>
                <Link
                  className="btn btn-primary"
                  href="/campaigns?segment=closeReward&incentive=points&name=Double-points+weekend&goal=Repeat+purchase"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                  </svg>
                  Launch double points
                </Link>
              </div>
              <div className="bo-side">
                <div className="si-flag">Also worth doing</div>
                <div className="si-text">
                  <b>{fmt(c.influencerAcquired)} influencer-acquired customers</b> can still refer a friend.
                </div>
                <Link
                  className="btn btn-secondary"
                  href="/campaigns?segment=influencerAcquired&goal=Referral&name=Referral+WhatsApp+offer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 11.5a8.4 8.4 0 01-12 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
                  </svg>
                  Send WhatsApp offer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
