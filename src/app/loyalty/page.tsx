import Link from "next/link";
import LoyaltyManager from "@/components/studio/LoyaltyManager";
import ConvertySyncCrumb from "@/components/studio/ConvertySyncCrumb";
import { getLoyalty, getLoyaltyCustomers, getConvertyStatus } from "@/lib/studio";
import { fmt, initials, avatarColor, tierChip, timeAgo, syncAgo } from "@/lib/format";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const loyaltyTabs = ["Program", "Rewards", "Customers", "Validation", "Points economy"];

export default async function LoyaltyProgramPage() {
  const [{ program, stats }, { customers }, converty] = await Promise.all([
    getLoyalty(),
    getLoyaltyCustomers(),
    getConvertyStatus().catch(() => null),
  ]);
  const syncLabel = converty?.lastSyncAt ? `Last sync ${syncAgo(converty.lastSyncAt)}` : "Not synced yet";

  return (
    <div className="has-tabbar">
      <header className="topbar">
        <div>
          <ConvertySyncCrumb className="crumb" />
          <h1>Loyalty</h1>
          <div className="subt">
            Reward customers after delivered orders and bring them back with simple points and perks.
          </div>
        </div>
        <div className="tb-actions">
          <span className="live-chip">
            <span className="ld"></span>{stats.members} members · {fmt(stats.pointsOutstanding)} pts live
          </span>
        </div>
      </header>

      <div className="tabbar">
        {loyaltyTabs.map((t, i) => (
          <div key={t} className={`tab${i === 0 ? " on" : ""}`}>
            {t}
          </div>
        ))}
      </div>

      <div className="content">
        {/* STATUS STRIP */}
        <div className="status-strip" data-screen-label="Status">
          <span className="status-pill live">
            <span className="ld"></span>Program {program.enabled ? "live" : "paused"}
          </span>
          <span className="status-pill cod">
            <Check />
            Points credited after delivered &amp; paid orders
          </span>
          <span className="status-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {syncLabel}
          </span>
        </div>

        {/* EARNING RULES + REWARDS (interactive) */}
        <LoyaltyManager program={program} />

        {/* STATUSES + VALIDATION */}
        <div className="block grid-12">
          <div className="panel span7" data-screen-label="Statuses">
            <div className="p-head">
              <div>
                <h3>Customer statuses</h3>
                <div className="sub">Simple levels from delivered orders — ongoing benefits, not badges</div>
              </div>
            </div>
            <div className="stat-list">
              {program.tiers.map((s, i) => (
                <div className="stat-row" key={`${s.name}-${i}`}>
                  <span className="sm" style={{ background: i === 0 ? "var(--bg-sunken)" : "#F0E2D8" }}>
                    {i === 0 ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#7A6F63">
                        <circle cx="12" cy="8" r="3.4" />
                        <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#C8744F">
                        <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                      </svg>
                    )}
                  </span>
                  <span className="snm">{s.name}</span>
                  <span className="sreq">{s.threshold === 0 ? "Default status" : `${s.threshold} delivered orders`}</span>
                  <span className="sben">
                    <small>Benefit</small>
                    {s.perk || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel span5" data-screen-label="Validation" style={{ padding: "18px 20px" }}>
            <div className="fp-title" style={{ marginBottom: "4px" }}>
              When points are credited
            </div>
            <div className="fp-sub" style={{ marginBottom: "14px" }}>
              Cash-on-delivery validation
            </div>
            <div className="cod-flow">
              <span className="cod-step">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M5 7h14l-1 13H6zM9 7V5a3 3 0 016 0v2" />
                </svg>
                Order placed
              </span>
              <span className="cod-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
              <span className="cod-step">Confirmed</span>
              <span className="cod-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
              <span className="cod-step">Delivered &amp; paid</span>
              <span className="cod-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
              <span className="cod-step final">
                <Check />
                Points credited
              </span>
            </div>
            <div className="est-note" style={{ margin: "16px 0 0" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 4l-7 12A2 2 0 005 19h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" />
              </svg>
              <span>
                Points are credited only after delivered &amp; paid orders. Refused, returned, or cancelled
                orders <b>do not earn points</b>.
              </span>
            </div>
          </div>
        </div>

        {/* LOYALTY CUSTOMERS */}
        <div className="panel" style={{ marginTop: "16px" }} data-screen-label="Loyalty customers">
          <div className="p-head">
            <div>
              <h3>Loyalty customers</h3>
              <div className="sub">Customers enrolled in the program</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th className="num">Points</th>
                <th>Status</th>
                <th>Last delivered order</th>
                <th className="num">Delivered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const tier = tierChip(c.tier);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="who-cell">
                        <span className="av" style={{ background: avatarColor(c.id) }}>
                          {initials(c.name)}
                        </span>
                        <span className="h">{c.name}</span>
                      </div>
                    </td>
                    <td className="muted">{c.phone}</td>
                    <td className="num">{fmt(c.points)}</td>
                    <td>
                      <span className={`tchip ${tier.cls}`}>
                        <span className="dot" style={{ background: tier.dot }}></span>
                        {tier.label}
                      </span>
                    </td>
                    <td className="muted">{timeAgo(c.lastDeliveredAt)}</td>
                    <td className="num">{c.delivered}</td>
                    <td>
                      <Link href={`/customers/${c.id}`} className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pager">
            <div className="info">Showing {customers.length} of {fmt(stats.members)} loyalty customers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
