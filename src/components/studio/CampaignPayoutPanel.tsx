"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markInfluencerPaid, updateCampaign } from "@/lib/studio-client";
import MarkAsPaidButton from "./MarkAsPaidButton";

interface InfluencerRow {
  id: string;
  handle: string;
  toPay: number;
  paid: boolean;
}

export default function CampaignPayoutPanel({
  slug,
  budget,
  toPayTotal,
  toPayList,
}: {
  slug: string;
  budget: number;
  toPayTotal: number;
  toPayList: InfluencerRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAllPaid() {
    if (!confirm(`Mark all ${toPayList.length} outstanding payouts as paid?`)) return;
    setBusy(true);
    setError(null);
    try {
      for (const inf of toPayList) {
        await markInfluencerPaid(inf.id);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payout failed");
      setBusy(false);
    }
  }

  async function increaseBudget() {
    const next = Math.round(budget * 1.25) || budget + 500;
    setBusy(true);
    setError(null);
    try {
      await updateCampaign(slug, { budget: next });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
      setBusy(false);
    }
  }

  return (
    <div className="qa">
      <div className="payout-sum">
        <div className="l">Commissions to pay</div>
        <div className="v">{toPayTotal.toLocaleString("en-US")} TND</div>
        <div className="s">{toPayList.length} influencer{toPayList.length === 1 ? "" : "s"} awaiting payout</div>
      </div>
      <div className="qa-actions">
        {toPayList.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={markAllPaid} disabled={busy}>
            Mark payouts as paid
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={increaseBudget} disabled={busy}>
          Increase budget (+25%)
        </button>
      </div>
      {toPayList.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {toPayList.map((inf) => (
            <div key={inf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <span>
                <b>{inf.handle}</b> · {inf.toPay.toLocaleString("en-US")} TND
              </span>
              <MarkAsPaidButton influencerId={inf.id} />
            </div>
          ))}
        </div>
      )}
      {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
