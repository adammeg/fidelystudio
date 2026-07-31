"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markInfluencerPaid } from "@/lib/studio-client";

export default function MarkAsPaidButton({
  influencerId,
  label = "Mark as paid",
  className = "btn btn-secondary btn-sm",
}: {
  influencerId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await markInfluencerPaid(influencerId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button type="button" className={className} onClick={pay} disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
      {error && <span style={{ fontSize: 10.5, color: "#C2603C", fontWeight: 600 }}>{error}</span>}
    </span>
  );
}
