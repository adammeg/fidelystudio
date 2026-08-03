"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoyaltyProgram } from "@/lib/studio";

export default function RewardRedeemer({ customerId, points, rewards }: { customerId: string; points: number; rewards: LoyaltyProgram["rewards"] }) {
  const router = useRouter(); const available = rewards.filter((reward) => reward.active && reward.cost <= points);
  const [selected, setSelected] = useState(available[0]?.id || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function redeem() { if (selected === "") return; const reward = rewards.find((item) => item.id === selected); if (!reward || !confirm(`Redeem ${reward.name} for ${reward.cost} points?`)) return; setBusy(true); setError(null); try { const response = await fetch(`/api/studio/loyalty/customers/${customerId}/redeem`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardId: selected }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || "Redemption failed"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Redemption failed"); } finally { setBusy(false); } }
  if (!available.length) return <span className="muted">No reward available</span>;
  return <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}><select className="input" aria-label="Reward" value={selected} onChange={(event) => setSelected(event.target.value)} style={{ width: 150 }}>{available.map((reward) => <option value={reward.id} key={reward.id}>{reward.name} · {reward.cost} pts</option>)}</select><button className="btn btn-secondary btn-sm" onClick={redeem} disabled={busy}>{busy ? "Issuing…" : "Issue gift"}</button>{error && <small style={{ color: "#C2603C" }}>{error}</small>}</div>;
}
