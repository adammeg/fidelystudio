"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

export interface SegmentOption {
  key: string;
  name: string;
  rule: string;
  count: number;
}

type Incentive = "points" | "free_delivery" | "discount" | "gift";
type Goal = "Repeat purchase" | "Reactivation" | "Referral" | "New customers" | "Revenue";

const INCENTIVES: { key: Incentive; label: string }[] = [
  { key: "points", label: "Double points" },
  { key: "free_delivery", label: "Free delivery" },
  { key: "discount", label: "Discount" },
  { key: "gift", label: "Custom reward" },
];

const GOALS: Goal[] = ["Repeat purchase", "Reactivation", "Referral", "New customers", "Revenue"];

const REWARD_PER: Record<Incentive, number> = { points: 1.5, free_delivery: 7, discount: 10, gift: 10 };

export type CampaignBuilderInitials = {
  segment?: string;
  name?: string;
  goal?: string;
  incentive?: string;
  type?: string;
};

function parseGoal(value?: string): Goal {
  if (value && (GOALS as string[]).includes(value)) return value as Goal;
  return "Repeat purchase";
}

function parseIncentive(value?: string): Incentive {
  if (value && INCENTIVES.some((i) => i.key === value)) return value as Incentive;
  return "points";
}

export default function CampaignBuilder({
  segments,
  storeName,
  initial,
}: {
  segments: SegmentOption[];
  storeName: string;
  initial?: CampaignBuilderInitials;
}) {
  const router = useRouter();
  const segKeys = new Set(segments.map((s) => s.key));
  const [name, setName] = useState(initial?.name || "Double-points weekend");
  const [segKey, setSegKey] = useState(
    initial?.segment && segKeys.has(initial.segment) ? initial.segment : segments[0]?.key || ""
  );
  const [incentive, setIncentive] = useState<Incentive>(parseIncentive(initial?.incentive));
  const [message, setMessage] = useState(
    `Salem, you're close to your next reward. This weekend, every delivered order earns double points.`
  );
  const [goal, setGoal] = useState<Goal>(parseGoal(initial?.goal));
  const hours = 48;
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segment = segments.find((s) => s.key === segKey) || segments[0];

  const est = useMemo(() => {
    const audience = segment?.count || 0;
    const messageCost = 0;
    const rewardsAtStake = Math.round(audience * REWARD_PER[incentive] * 0.6);
    const max = messageCost + rewardsAtStake;
    const risk = max < 1000 ? { label: "Low", dot: "#3E8E5A", cls: "c-pr" } : max < 3000 ? { label: "Medium", dot: "#C98A2B", cls: "c-wc" } : { label: "High", dot: "#C25B4E", cls: "c-pay" };
    return { audience, messageCost, rewardsAtStake, max, risk };
  }, [segment, incentive]);

  const activeChannels = ["whatsapp"] as const;
  const incentiveLabel = INCENTIVES.find((i) => i.key === incentive)?.label || "";

  async function launch() {
    setLaunching(true);
    setError(null);
    try {
      const type = goal === "Referral" ? "referral" : "loyalty";
      const res = await fetch("/api/studio/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          goal,
          channels: activeChannels,
          durationLabel: `${hours} hours`,
          customerDiscountPct: incentive === "discount" ? 10 : 0,
          commissionPct: 0,
          segmentKey: segKey || undefined,
          incentiveType: incentive,
          message,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Launch failed");
      const data = await res.json();
      router.push(`/campaigns/${data.campaign.slug}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed");
      setLaunching(false);
    }
  }

  const preview = message.replace("{store}", storeName);

  return (
    <div className="block grid-12">
      {/* LEFT: builder */}
      <div className="span7" data-screen-label="Builder steps">
        <div className="bsec">
          <div className="field" style={{ margin: 0 }}>
            <label>Campaign name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: "420px", fontWeight: 700 }} />
          </div>
        </div>

        {/* WHO */}
        <div className="bsec">
          <div className="bsec-head">
            <span className="bsec-badge">
              <Check />
            </span>
            <div>
              <div className="bsec-eyebrow">Step 1 · Who</div>
              <div className="bsec-title">Audience</div>
            </div>
            <select className="input" value={segKey} onChange={(e) => setSegKey(e.target.value)} style={{ marginLeft: "auto", maxWidth: "200px" }}>
              {segments.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="seg-pick">
            <span className="sp-ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
              </svg>
            </span>
            <div>
              <div className="sp-nm">{segment?.name}</div>
              <div className="sp-rule">{segment?.rule}</div>
            </div>
            <div className="sp-count">
              <div className="n">{est.audience.toLocaleString("en-US")}</div>
              <div className="u">customers</div>
            </div>
          </div>
        </div>

        {/* WHAT */}
        <div className="bsec">
          <div className="bsec-head">
            <span className="bsec-badge">
              <Check />
            </span>
            <div>
              <div className="bsec-eyebrow">Step 2 · What</div>
              <div className="bsec-title">Incentive &amp; message</div>
            </div>
          </div>
          <div className="choice-row">
            {INCENTIVES.map((i) => (
              <span key={i.key} className={`choice${incentive === i.key ? " on" : ""}`} onClick={() => setIncentive(i.key)} style={{ cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
                </svg>
                {i.label}
              </span>
            ))}
            <span className="dur-pill">Duration: {hours} hours</span>
          </div>
          <div className="cod-mini">
            <Check />
            Rewards only credited after delivered &amp; paid orders
          </div>
          <div className="field" style={{ marginTop: "18px" }}>
            <label>Message</label>
            <textarea className="input" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        {/* WHERE */}
        <div className="bsec">
          <div className="bsec-head">
            <span className="bsec-badge">
              <Check />
            </span>
            <div>
              <div className="bsec-eyebrow">Step 3 · Where</div>
              <div className="bsec-title">Channels</div>
            </div>
          </div>
          <div className="opt-row" style={{ gridTemplateColumns: "1fr" }}>
            {(["whatsapp"] as const).map((c) => (
              <div key={c} className="opt on">
                <span className="oic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="M7 10h6M7 14h4" />
                  </svg>
                </span>
                <span className="otx" style={{ textTransform: "capitalize" }}>{c}</span>
                {(
                  <span className="ock">
                    <Check />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GOAL */}
        <div className="bsec">
          <div className="bsec-head">
            <span className="bsec-badge">
              <Check />
            </span>
            <div>
              <div className="bsec-eyebrow">Step 4 · Goal</div>
              <div className="bsec-title">What this campaign is for</div>
            </div>
          </div>
          <div className="goal-row">
            {GOALS.map((g) => (
              <span key={g} className={`goal${goal === g ? " on" : ""}`} onClick={() => setGoal(g)} style={{ cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 12a9 9 0 019-9 9 9 0 016.5 2.8L21 8M21 3v5h-5" />
                  <path d="M21 12a9 9 0 01-9 9 9 9 0 01-6.5-2.8L3 16" />
                </svg>
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: ESTIMATE / SIMULATOR */}
      <div className="span5">
        <div className="est" data-screen-label="Launch check">
          <div className="est-head">
            <div className="eh-e">Step 5 · Cost check before launch</div>
            <div className="eh-t">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3E8E5A" strokeWidth="2.4" style={{ width: "20px", height: "20px", flexShrink: 0 }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12l2.5 2.5 4.5-5" />
              </svg>
              Ready to save
            </div>
            <div className="est-chips">
              <span className={`chip-i ${est.risk.cls}`}>
                <span className="dot" style={{ background: est.risk.dot }}></span>
                Cost risk: {est.risk.label}
              </span>
            </div>
          </div>
          <div className="est-body">
            <div className="est-ready">
              <div className="est-rowi">
                <span>Audience</span>
                <span className="rv">{est.audience.toLocaleString("en-US")} customers</span>
              </div>
              <div className="est-rowi">
                <span>Channel</span>
                <span className="rv" style={{ textTransform: "capitalize" }}>{activeChannels.join(", ") || "—"}</span>
              </div>
              <div className="est-rowi">
                <span>Reward</span>
                <span className="rv">{incentiveLabel} · {hours}h</span>
              </div>
            </div>

            <div className="est-break">
              <div className="est-rowi">
                <span>Message cost</span>
                <span className="rv">Included in your Fidely plan</span>
              </div>
              <div className="est-rowi">
                <span>Rewards at stake</span>
                <span className="rv">up to {est.rewardsAtStake.toLocaleString("en-US")} TND</span>
              </div>
              <div className="est-rowi total">
                <span>Maximum campaign cost</span>
                <span className="rv">{est.max.toLocaleString("en-US")} TND</span>
              </div>
            </div>

            <div className="est-note">
              <Check />
              <span>
                Rewards are credited <b>only after delivered &amp; paid</b> orders — never at checkout. No delivery,
                no cost.
              </span>
            </div>

            <div className="est-prev">
              <div className="pl">Customer sees</div>
              <div className="wa-preview" style={{ padding: "14px" }}>
                <div className="wa-bubble">{preview}</div>
                <div className="wa-meta">
                  via WhatsApp · 9:24 AM
                  <svg viewBox="0 0 24 24" fill="none" stroke="#34B7F1" strokeWidth="3">
                    <path d="M2 13l4 4L13 7" />
                    <path d="M10 13l4 4L22 7" />
                  </svg>
                </div>
              </div>
            </div>

            {error && <div className="login-error" style={{ marginTop: "10px" }}>{error}</div>}

            <div className="est-cta">
              <button className="btn btn-primary" onClick={launch} disabled={launching}>
                <Check />
                {launching ? "Saving…" : "Save campaign draft"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
