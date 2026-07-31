"use client";

import { useState } from "react";
import type { LoyaltyProgram } from "@/lib/studio";

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

function ruleIcon(icon: string) {
  switch (icon) {
    case "cart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 7h14l-1 13H6zM9 7V5a3 3 0 016 0v2" />
        </svg>
      );
    case "gift":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7M2 8h20v4H2zM12 8v12" />
        </svg>
      );
    case "star":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 3l2.5 5.2 5.5.8-4 3.9 1 5.6L12 16l-5 2.5 1-5.6-4-3.9 5.5-.8z" />
        </svg>
      );
  }
}

function ruleReward(r: LoyaltyProgram["earnRules"][number]) {
  if (r.perAmount > 0) return `${r.points} pt / ${r.perAmount} TND`;
  return `+${r.points} points`;
}

export default function LoyaltyManager({ program }: { program: LoyaltyProgram }) {
  const [earnRules, setEarnRules] = useState(program.earnRules);
  const [rewards, setRewards] = useState(program.rewards);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRule(i: number) {
    setEarnRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, active: !r.active } : r)));
  }
  function toggleReward(i: number) {
    setRewards((rs) => rs.map((r, idx) => (idx === i ? { ...r, active: !r.active } : r)));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/studio/loyalty", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earnRules, rewards }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* EARNING RULES */}
      <div className="panel" data-screen-label="Earning rules">
        <div className="p-head">
          <div>
            <h3>How customers earn points</h3>
            <div className="sub">
              Turn rules on or off. Every rule validates on delivered &amp; paid orders.
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {saved && <span style={{ color: "var(--pos-fg)", fontSize: "12.5px", fontWeight: 700 }}>Saved ✓</span>}
            {error && <span style={{ color: "#C25B4E", fontSize: "12.5px", fontWeight: 700 }}>{error}</span>}
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              <Check />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Trigger</th>
              <th>Reward</th>
              <th>Validation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {earnRules.map((r, i) => (
              <tr key={`${r.name}-${i}`} className={r.active ? undefined : "row-inactive"}>
                <td>
                  <div className="rule-nm">
                    <span className="rule-ic">{ruleIcon(r.icon)}</span>
                    <span className="nm">{r.name}</span>
                  </div>
                </td>
                <td className="muted">{r.note || "—"}</td>
                <td>
                  <span className="rwd-badge">{ruleReward(r)}</span>
                </td>
                <td>
                  <span className="val-chip">
                    <Check />
                    Delivered &amp; paid
                  </span>
                </td>
                <td>
                  <div className="status-cell" onClick={() => toggleRule(i)} style={{ cursor: "pointer" }}>
                    <span className={`toggle${r.active ? " on" : ""}`}></span>
                    <span className={`sl${r.active ? " on" : ""}`}>{r.active ? "Active" : "Inactive"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tbl-foot">
          To avoid over-rewarding, some rules can be left inactive and switched on during a campaign.
        </div>
      </div>

      {/* REWARDS */}
      <div className="panel" style={{ marginTop: "16px" }} data-screen-label="Rewards">
        <div className="p-head">
          <div>
            <h3>What points unlock</h3>
            <div className="sub">Rewards customers redeem with their points</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Points</th>
              <th>Reward</th>
              <th>Note</th>
              <th className="num">Redeemed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r, i) => (
              <tr key={`${r.name}-${i}`} className={r.active ? undefined : "row-inactive"}>
                <td>
                  <span className="pts-cell">
                    <span className="n">{r.cost}</span>
                    <span className="u">pts</span>
                  </span>
                </td>
                <td style={{ fontWeight: 700 }}>{r.name}</td>
                <td className="muted">{r.note || "—"}</td>
                <td className="num">{r.redeemed}</td>
                <td>
                  <div className="status-cell" onClick={() => toggleReward(i)} style={{ cursor: "pointer" }}>
                    <span className={`toggle${r.active ? " on" : ""}`}></span>
                    <span className={`sl${r.active ? " on" : ""}`}>{r.active ? "Active" : "Inactive"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
